"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pkg = require("../package.json");
const index = require("../index.js");

const expectedReleaseUrl = "https://github.com/obinexus/libpolycall/releases#release-libpolycall-1.0.0";

assert.equal(pkg.name, "@obinexusltd/curl-polycall");
assert.equal(pkg.license, "MIT");
assert.equal(pkg.author, "Nnamdi Michael Okpala <okpalan@protonmail.com>");
assert.equal(pkg.homepage, expectedReleaseUrl);
assert.equal(pkg.config.libpolycallHostUrl, expectedReleaseUrl);
assert.equal(pkg.libpolycall.release, "1.0.0");
assert.equal(pkg.libpolycall.hostUrl, expectedReleaseUrl);
assert.equal(pkg.publishConfig.access, "public");

assert.equal(pkg.main, "index.js");
assert.equal(pkg.bin["curl-polycall"], "bin/curl-polycall.js");
assert.equal(pkg.bin["curl-polycall-server"], "bin/curl-polycall-server.js");

for (const executable of Object.values(pkg.bin)) {
  const fullPath = path.join(__dirname, "..", executable);
  assert.ok(fs.existsSync(fullPath), `${executable} exists`);
  assert.match(fs.readFileSync(fullPath, "utf8"), /^#!\/usr\/bin\/env node/);
}

for (const directory of ["bin", "config", "docs", "examples", "scripts", "src", "tests"]) {
  assert.ok(fs.existsSync(path.join(__dirname, "..", directory)), `${directory} exists`);
}

assert.equal(index.packageName, pkg.name);
assert.equal(index.releaseHostUrl, expectedReleaseUrl);
assert.ok(index.listFiles("src").includes("src/polycall_ffi.c"));
assert.ok(index.listFiles("bin").includes("bin/curl-polycall.js"));

console.log("curl-polycall npm package metadata test: PASS");
