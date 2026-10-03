"use strict";

// The shipped examples against a REAL Polycall peer node (`polycall peer
// serve` from the C core): examples/curl.sh (raw curl requests, then the
// client) and examples/curl.ps1 (PowerShell + curl.exe) under every
// PowerShell found (pwsh 7, and Windows PowerShell 5.1 on Windows). Missing
// tools -> SKIP with the reason; CURL_POLYCALL_REQUIRE_TOOLS=1 makes a
// missing sh / curl / polycall CLI a failure (PowerShell stays optional off
// Windows, where the .ps1 example does not apply).

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync, execFile } = require("node:child_process");

const root = path.join(__dirname, "..");
const ok = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8", windowsHide: true }).status === 0;
const cli = process.env.POLYCALL_CLI ? (fs.existsSync(process.env.POLYCALL_CLI) ? process.env.POLYCALL_CLI : null)
  : (ok("polycall", ["--version"]) ? "polycall" : null);
const missing = [
  ok("sh", ["-c", "exit 0"]) ? "" : "no POSIX sh on PATH",
  ok("curl", ["--version"]) ? "" : "no curl on PATH",
  cli ? "" : "no polycall CLI (set POLYCALL_CLI or put polycall on PATH)"
].filter(Boolean).join("; ");
const required = process.env.CURL_POLYCALL_REQUIRE_TOOLS === "1" || Boolean(process.env.POLYCALL_CLI && !cli);
const suite = !missing ? describe
  : required ? (name) => test(`${name} -- REQUIRED but unavailable`, () => { throw new Error(missing); })
    : (name) => test(name, { skip: missing }, () => {});

const powershells = [];
if (ok("pwsh", ["-NoProfile", "-Command", "exit 0"])) powershells.push("pwsh");
if (process.platform === "win32" && ok("powershell.exe", ["-NoProfile", "-Command", "exit 0"])) powershells.push("powershell.exe");
const psSkip = process.platform !== "win32" ? "examples/curl.ps1 uses curl.exe: a Windows example"
  : (powershells.length ? false : "no PowerShell (pwsh / powershell.exe) on PATH");

const token = `t-${crypto.randomBytes(12).toString("hex")}`;

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", timeout: 60000, windowsHide: true },
      (error, stdout, stderr) => resolve({ status: error ? (typeof error.code === "number" ? error.code : -1) : 0, stdout, stderr }));
    child.stdin.on("error", () => {}); // the examples never read stdin
    child.stdin.end();
  });
}

async function serve(nodeId, dir) {
  const proc = spawn(cli, ["peer", "serve", "--node-id", nodeId, "--endpoint", "127.0.0.1:0"],
    { cwd: dir, env: { ...process.env, POLYCALL_DEV_TOKEN: token }, windowsHide: true });
  let out = "";
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (d) => { out += d; });
  proc.stderr.resume();
  const t0 = Date.now();
  for (;;) {
    const m = /"event":"listening".*?"endpoint":"([^"]+)"/.exec(out);
    if (m) return { endpoint: m[1], stop: () => new Promise((r) => { if (proc.exitCode !== null) r(); else { proc.once("exit", r); proc.kill(); } }) };
    if (Date.now() - t0 > 10000 || proc.exitCode !== null) throw new Error(`peer serve did not start: ${out}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

suite("shipped examples vs a C peer node (polycall peer serve)", () => {
  let dir;
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "curl-polycall-examples-")); });
  after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));

  test("examples/curl.sh: raw curl requests, then the client", async () => {
    const node = await serve("sh-node", dir);
    try {
      const r = await run("sh", ["examples/curl.sh", node.endpoint], { POLYCALL_DEV_TOKEN: token });
      assert.equal(r.status, 0, r.stderr);
      const lines = r.stdout.split(/\r?\n/).filter((l) => l.startsWith("{"));
      const [health, received, next, sent, recv] = lines.map((l) => JSON.parse(l));
      assert.equal(health.protocol, "polycall-peer/1");
      assert.equal(health.node_id, "sh-node");
      assert.deepEqual(received, { ok: true, status: "received", node_id: "sh-node", id: "demo-1", duplicate: false });
      assert.deepEqual(next.message, { from: "curl-demo", id: "demo-1", payload_b64: Buffer.from("hello").toString("base64") });
      assert.equal(sent.delivered, true);
      assert.equal(sent.id, "demo-2");
      assert.equal(recv.id, "demo-2");
      assert.equal(Buffer.from(recv.payload_b64, "base64").toString(), "hello again");
    } finally {
      await node.stop();
    }
  });

  for (const ps of powershells.length ? powershells : ["pwsh"]) {
    test(`examples/curl.ps1 under ${ps}`, { skip: psSkip }, async () => {
      const node = await serve("ps-node", dir);
      try {
        const r = await run(ps, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join("examples", "curl.ps1"), node.endpoint],
          { POLYCALL_DEV_TOKEN: token });
        assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
        assert.match(r.stdout, /"protocol":"polycall-peer\/1","node_id":"ps-node"/);
        assert.match(r.stdout, /\{"ok":true,"status":"received","node_id":"ps-node","id":"ps-demo-1","duplicate":false\}/);
        assert.match(r.stdout, /from=curl-demo id=ps-demo-1 payload=hello from PowerShell/);
        assert.doesNotMatch(r.stdout + r.stderr, new RegExp(token), "the token is never printed");
      } finally {
        await node.stop();
      }
    });
  }
});
