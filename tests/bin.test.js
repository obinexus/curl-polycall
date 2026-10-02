"use strict";

// The client's own surface (no node needed): help, version, syntax, usage errors.

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const pkg = require("../package.json");
const client = path.join(__dirname, "..", pkg.bin["curl-polycall"]);
const haveSh = spawnSync("sh", ["-c", "exit 0"]).status === 0;
const skip = haveSh ? false : "no POSIX sh on PATH";

function run(args) {
  return spawnSync("sh", [client, ...args], { encoding: "utf8" });
}

test("sh -n: the script parses", { skip }, () => {
  const r = spawnSync("sh", ["-n", client], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("help and version", { skip }, () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /curl-polycall <command> --to HOST:PORT/);
  for (const cmd of ["health", "peers", "register", "send", "recv"]) assert.match(help.stdout, new RegExp(`\\n  ${cmd} `));
  const version = run(["version"]);
  assert.equal(version.stdout.trim(), `curl-polycall ${pkg.version} (polycall-peer/1)`);
});

test("usage errors exit 2 without touching the network", { skip }, () => {
  assert.equal(run([]).status, 2);
  assert.equal(run(["health"]).status, 2);
  assert.equal(run(["health", "--to", "999.1.1.1:99999"]).status, 2);
  assert.equal(run(["send", "--to", "127.0.0.1:1", "--payload", "a", "--payload-file", "x"]).status, 2);
  assert.equal(run(["send", "--to", "127.0.0.1:1", "--from", "has space", "--payload", "a"]).status, 2);
  assert.equal(run(["peers", "--to", "127.0.0.1:1", "--token-env", "1BAD"]).status, 2);
});
