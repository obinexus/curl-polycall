"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const pkg = require("../package.json");
const root = path.resolve(__dirname, "..");
const cli = path.join(root, pkg.bin["curl-polycall"]);
const serverCli = path.join(root, pkg.bin["curl-polycall-server"]);

function run(args) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8"
  });
}

const help = run([cli, "--help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /Usage:/);
assert.match(help.stdout, /curl-polycall server/);
assert.match(help.stdout, /release-libpolycall-1\.0\.0/);

const version = run([cli, "--version"]);
assert.equal(version.status, 0, version.stderr);
assert.equal(version.stdout.trim(), pkg.version);

const serverHelp = run([serverCli, "--help"]);
assert.equal(serverHelp.status, 0, serverHelp.stderr);
assert.match(serverHelp.stdout, /curl-polycall-server/);

console.log("curl-polycall npm bin smoke test: PASS");
