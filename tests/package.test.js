"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pkg = require("../package.json");
const manifest = require("../polycall-binding.json");
const index = require("../index.js");
const root = path.join(__dirname, "..");

test("npm metadata points at the real repositories", () => {
  assert.equal(pkg.name, "@obinexusltd/curl-polycall");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Nnamdi Michael Okpala <okpalan@protonmail.com>");
  assert.equal(pkg.homepage, "https://github.com/obinexus/curl-polycall#readme");
  assert.equal(pkg.repository.url, "git+https://github.com/obinexus/curl-polycall.git");
  assert.equal(pkg.bugs.url, "https://github.com/obinexus/curl-polycall/issues");
  assert.equal(pkg.polycall.core_repository, "https://github.com/obinexus/polycall");
  assert.deepEqual(pkg.bin, { "curl-polycall": "bin/curl-polycall" });
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.core, "polycall >= 1.1.0 (binding ABI 1)");
  const all = [JSON.stringify(pkg), JSON.stringify(manifest), fs.readFileSync(path.join(root, "README.md"), "utf8"),
    fs.readFileSync(path.join(root, "debian", "control"), "utf8"), fs.readFileSync(path.join(root, "debian", "copyright"), "utf8")].join("\n");
  assert.doesNotMatch(all, /github\.com\/obinexusltd|obinexus\/libpolycall|libpolycall-1\.0\.0|releases#release/);
});

test("no squatting stub, no committed build products", () => {
  for (const gone of ["src/polycall_ffi.c", "src/polycall_ffi.h", "ffi.py", "server.py", "build"]) {
    assert.equal(fs.existsSync(path.join(root, gone)), false, `${gone} must not exist`);
  }
  // "#!/usr/bin/env sh", LF: for "#!/bin/sh" npm's Windows shims run the literal
  // path "/bin/sh" (-> \bin\sh on the current drive) and the bin cannot start;
  // with env they run "sh" from PATH (Git Bash / MSYS2).
  assert.ok(fs.readFileSync(path.join(root, "bin", "curl-polycall"), "utf8").startsWith("#!/usr/bin/env sh\n"), "env sh shebang, LF");
  assert.equal(index.client, path.join(root, "bin", "curl-polycall"));
  assert.ok(index.listFiles("bin").includes("bin/curl-polycall"));
});
