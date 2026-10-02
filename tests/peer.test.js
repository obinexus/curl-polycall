"use strict";

// bin/curl-polycall against REAL Polycall peer nodes (`polycall peer serve`
// from the C core) -- payloads both ways with exact bytes, sender id and
// message id verified at the receiver. Skipped (reported as SKIP, with the
// reason) when sh, curl, base64 or a polycall CLI is missing;
// CURL_POLYCALL_REQUIRE_TOOLS=1 turns that into a failure.

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync, execFile } = require("node:child_process");

const client = path.join(__dirname, "..", "bin", "curl-polycall");

function available(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true });
  return r.status === 0;
}

function findPolycall() {
  if (process.env.POLYCALL_CLI) return fs.existsSync(process.env.POLYCALL_CLI) ? process.env.POLYCALL_CLI : null;
  return available("polycall", ["--version"]) ? "polycall" : null;
}

const cli = findPolycall();
const missing = [
  available("sh", ["-c", "exit 0"]) ? "" : "no POSIX sh on PATH",
  available("curl", ["--version"]) ? "" : "no curl on PATH",
  available("sh", ["-c", "printf a | base64"]) ? "" : "no base64 on PATH",
  cli ? "" : "no polycall CLI (set POLYCALL_CLI or put polycall on PATH)"
].filter(Boolean).join("; ");
if (missing && process.env.CURL_POLYCALL_REQUIRE_TOOLS === "1") throw new Error(missing);
const suite = missing ? (name) => test(name, { skip: missing }, () => {}) : describe;

const token = `t-${crypto.randomBytes(12).toString("hex")}`;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "curl-polycall-"));
const env = { ...process.env, POLYCALL_DEV_TOKEN: token };

function run(cmd, args, { extraEnv = {}, input } = {}) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      env: { ...env, ...extraEnv }, cwd: scratch, encoding: "buffer", maxBuffer: 8 << 20, windowsHide: true, timeout: 60000
    }, (error, stdout, stderr) => {
      resolve({ status: error ? (typeof error.code === "number" ? error.code : -1) : 0, stdout, stderr: stderr.toString() });
    });
    child.stdin.end(input === undefined ? "" : input);
  });
}

const curlPolycall = (args, options) => run("sh", [client, ...args], options);

async function serve(nodeId, { printMessages = false } = {}) {
  const args = ["peer", "serve", "--node-id", nodeId, "--endpoint", "127.0.0.1:0"];
  if (printMessages) args.push("--print-messages");
  const proc = spawn(cli, args, { env, cwd: scratch, windowsHide: true });
  const events = [];
  let buffer = "";
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (line) events.push(JSON.parse(line));
    }
  });
  proc.stderr.resume();
  const started = Date.now();
  while (!events.some((e) => e.event === "listening")) {
    if (Date.now() - started > 10000) throw new Error("peer serve did not start");
    await new Promise((r) => setTimeout(r, 25));
  }
  return {
    endpoint: events.find((e) => e.event === "listening").endpoint,
    events,
    async message(id, timeoutMs = 10000) {
      const t0 = Date.now();
      for (;;) {
        const found = events.find((e) => e.event === "message" && e.id === id);
        if (found) return found;
        if (Date.now() - t0 > timeoutMs) throw new Error(`message ${id} not received`);
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    async stop() {
      if (proc.exitCode !== null || proc.signalCode !== null) return;
      const exited = new Promise((r) => proc.once("exit", r));
      proc.kill();
      await exited;
    }
  };
}

function payloads() {
  const all = Buffer.alloc(256);
  for (let i = 0; i < 256; i += 1) all[i] = i;
  const mib = Buffer.alloc(1 << 20);
  for (let i = 0; i < mib.length; i += 1) mib[i] = (i * 131 + 17) & 0xff;
  return {
    empty: Buffer.alloc(0),
    utf8: Buffer.from("héllo wörld – 漢字 – 🚀", "utf8"),
    binaryNul: Buffer.concat([Buffer.from([0, 0, 10, 13, 0]), all, Buffer.from([0])]),
    exactlyOneMiB: mib
  };
}

function rawPost(endpoint, pathName, body) {
  const [host, port] = endpoint.split(":");
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port: Number(port), method: "POST", path: pathName,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end(body);
  });
}

suite("curl-polycall vs C peer nodes (polycall peer serve)", () => {
  let printer;
  let quiet;
  before(async () => {
    printer = await serve("c-printer", { printMessages: true });
    quiet = await serve("c-quiet");
  });
  after(async () => {
    if (printer) await printer.stop();
    if (quiet) await quiet.stop();
    fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  });

  test("health, with and without the expected node id", async () => {
    const ok = await curlPolycall(["health", "--to", printer.endpoint, "--expect-node", "c-printer"]);
    assert.equal(ok.status, 0, ok.stderr);
    const health = JSON.parse(ok.stdout.toString());
    assert.equal(health.protocol, "polycall-peer/1");
    assert.equal(health.node_id, "c-printer");
    const wrong = await curlPolycall(["health", "--to", printer.endpoint, "--expect-node", "someone-else"]);
    assert.equal(wrong.status, 5);
  });

  test("curl -> C: empty, UTF-8, binary with NUL, exactly 1 MiB (bytes, sender, id at the C receiver)", async () => {
    for (const [name, bytes] of Object.entries(payloads())) {
      const file = path.join(scratch, `${name}.bin`);
      fs.writeFileSync(file, bytes);
      const id = `curl2c-${name}`;
      const sent = await curlPolycall(["send", "--to", printer.endpoint, "--payload-file", file, "--from", "curl-node",
        "--id", id, "--expect-node", "c-printer", "-t", "20000"]);
      assert.equal(sent.status, 0, `${name}: ${sent.stderr}`);
      const ack = JSON.parse(sent.stdout.toString());
      assert.deepEqual(ack, { delivered: true, to: printer.endpoint, node_id: "c-printer", from: "curl-node", id, bytes: bytes.length, duplicate: false });
      const event = await printer.message(id);
      assert.equal(event.from, "curl-node");
      assert.equal(event.bytes, bytes.length);
      assert.ok(Buffer.from(event.payload_b64, "base64").equals(bytes), `${name}: bytes differ`);
    }
  });

  test("payload from stdin and --payload text", async () => {
    const bytes = Buffer.from([0, 1, 2, 255, 0]);
    const sent = await curlPolycall(["send", "--to", printer.endpoint, "--payload-file", "-", "--id", "stdin-1"], { input: bytes });
    assert.equal(sent.status, 0, sent.stderr);
    assert.ok(Buffer.from((await printer.message("stdin-1")).payload_b64, "base64").equals(bytes));
    const text = await curlPolycall(["send", "--to", printer.endpoint, "--payload", "plain text", "--id", "text-1"]);
    assert.equal(text.status, 0, text.stderr);
    const ev = await printer.message("text-1");
    assert.equal(Buffer.from(ev.payload_b64, "base64").toString(), "plain text");
    assert.equal(ev.from, "curl-polycall", "default sender id");
  });

  test("1 MiB + 1 is refused before any I/O (exit 2)", async () => {
    const file = path.join(scratch, "too-big.bin");
    fs.writeFileSync(file, Buffer.alloc((1 << 20) + 1, 1));
    const sent = await curlPolycall(["send", "--to", printer.endpoint, "--payload-file", file, "--id", "too-big"]);
    assert.equal(sent.status, 2);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(printer.events.filter((e) => e.id === "too-big").length, 0);
  });

  test("C -> curl: polycall peer send, then curl-polycall recv (JSON and --raw)", async () => {
    for (const [name, bytes] of Object.entries(payloads())) {
      const file = path.join(scratch, `c-${name}.bin`);
      fs.writeFileSync(file, bytes);
      const id = `c2curl-${name}`;
      const sent = await run(cli, ["peer", "send", "--to", quiet.endpoint, "--payload-file", file, "--from", "c-sender", "--id", id, "-t", "20000"]);
      assert.equal(sent.status, 0, sent.stderr);
      if (name === "utf8") {
        const got = await curlPolycall(["recv", "--to", quiet.endpoint, "-t", "2000"]);
        assert.equal(got.status, 0, got.stderr);
        const message = JSON.parse(got.stdout.toString());
        assert.equal(message.from, "c-sender");
        assert.equal(message.id, id);
        assert.equal(message.bytes, bytes.length);
        assert.ok(Buffer.from(message.payload_b64, "base64").equals(bytes));
      } else {
        const got = await curlPolycall(["recv", "--to", quiet.endpoint, "-t", "2000", "--raw"]);
        assert.equal(got.status, 0, got.stderr);
        assert.ok(got.stdout.equals(bytes), `${name}: bytes differ (${got.stdout.length} vs ${bytes.length})`);
      }
    }
  });

  test("receive timeout on an empty inbox (exit 6)", async () => {
    const t0 = Date.now();
    const got = await curlPolycall(["recv", "--to", quiet.endpoint, "-t", "200"]);
    assert.equal(got.status, 6);
    assert.ok(Date.now() - t0 < 5000, "honours the timeout");
  });

  test("duplicate message id is stored once", async () => {
    const first = await curlPolycall(["send", "--to", printer.endpoint, "--payload", "dup", "--id", "dup-1"]);
    const second = await curlPolycall(["send", "--to", printer.endpoint, "--payload", "dup", "--id", "dup-1"]);
    assert.equal(JSON.parse(first.stdout.toString()).duplicate, false);
    assert.equal(JSON.parse(second.stdout.toString()).duplicate, true);
    await printer.message("dup-1");
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(printer.events.filter((e) => e.id === "dup-1").length, 1);
  });

  test("register / peers: the node's own registry; receiving never registers the sender", async () => {
    const before = JSON.parse((await curlPolycall(["peers", "--to", printer.endpoint])).stdout.toString());
    assert.deepEqual(before.peers, {}, "senders were never registered");
    const reg = await curlPolycall(["register", "--to", printer.endpoint, "--id", "via-curl", "--peer-endpoint", "127.0.0.1:7"]);
    assert.equal(reg.status, 0, reg.stderr);
    const after = JSON.parse((await curlPolycall(["peers", "--to", printer.endpoint])).stdout.toString());
    assert.deepEqual(after.peers, { "via-curl": "127.0.0.1:7" });
    const other = JSON.parse((await curlPolycall(["peers", "--to", quiet.endpoint])).stdout.toString());
    assert.deepEqual(other.peers, {}, "another node's registry is untouched");
  });

  test("auth failure (wrong or missing token) -> exit 7", async () => {
    const wrong = await curlPolycall(["send", "--to", printer.endpoint, "--payload", "x", "--id", "auth-1"], { extraEnv: { POLYCALL_DEV_TOKEN: "wrong" } });
    assert.equal(wrong.status, 7, wrong.stderr);
    const none = await curlPolycall(["peers", "--to", printer.endpoint], { extraEnv: { POLYCALL_DEV_TOKEN: "" } });
    assert.equal(none.status, 7);
    const named = await curlPolycall(["peers", "--to", printer.endpoint, "--token-env", "MY_PEER_TOKEN"], { extraEnv: { MY_PEER_TOKEN: token } });
    assert.equal(named.status, 0, named.stderr);
    const health = await curlPolycall(["health", "--to", printer.endpoint], { extraEnv: { POLYCALL_DEV_TOKEN: "" } });
    assert.equal(health.status, 0, "/health needs no token");
  });

  test("dead peer -> exit 5; bad arguments -> exit 2", async () => {
    const server = net.createServer();
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const dead = `127.0.0.1:${server.address().port}`;
    await new Promise((r) => server.close(r));
    assert.equal((await curlPolycall(["send", "--to", dead, "--payload", "x"])).status, 5);
    assert.equal((await curlPolycall(["send", "--to", "nohostport", "--payload", "x"])).status, 2);
    assert.equal((await curlPolycall(["send", "--to", printer.endpoint, "--payload", "x", "--id", "bad id"])).status, 2);
    assert.equal((await curlPolycall(["send", "--to", printer.endpoint])).status, 2);
    assert.equal((await curlPolycall(["recv", "--to", quiet.endpoint, "-t", "30001"])).status, 2);
    assert.equal((await curlPolycall(["bogus"])).status, 2);
  });

  test("wrong identity: --expect-node mismatch on send -> exit 5", async () => {
    const sent = await curlPolycall(["send", "--to", printer.endpoint, "--payload", "x", "--id", "ident-1", "--expect-node", "impostor"]);
    assert.equal(sent.status, 5);
  });

  test("concurrent curl senders: each message delivered exactly once", async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `conc-${i}`);
    const results = await Promise.all(ids.map((id) => curlPolycall(["send", "--to", printer.endpoint, "--payload", id, "--from", `curl-${id}`, "--id", id])));
    results.forEach((r) => assert.equal(r.status, 0, r.stderr));
    for (const id of ids) {
      const ev = await printer.message(id);
      assert.equal(ev.from, `curl-${id}`);
      assert.equal(Buffer.from(ev.payload_b64, "base64").toString(), id);
    }
    await new Promise((r) => setTimeout(r, 300));
    for (const id of ids) assert.equal(printer.events.filter((e) => e.id === id).length, 1);
  });

  test("backpressure: a full inbox answers 503 -> exit 1 (busy)", async () => {
    const full = await serve("c-full");
    try {
      for (let i = 0; i < 256; i += 1) {
        const body = JSON.stringify({ v: 1, id: `fill-${i}`, from: "filler", payload_b64: "" });
        assert.equal(await rawPost(full.endpoint, "/receive", body), 200);
      }
      const sent = await curlPolycall(["send", "--to", full.endpoint, "--payload", "x", "--id", "overflow"]);
      assert.equal(sent.status, 1);
      assert.match(sent.stderr, /busy|503/);
    } finally {
      await full.stop();
    }
  });
});
