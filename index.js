"use strict";

// curl-polycall: the package's executable is bin/curl-polycall,
// a POSIX sh + curl(1) client of the polycall-peer/1 protocol. This module
// only exposes where things are, for tooling that wants to run it.

const fs = require("node:fs");
const path = require("node:path");

const packageJson = require("./package.json");
const root = __dirname;

const POLYCALL_CORE_URL = "https://github.com/obinexus/polycall";
const PROTOCOL = "polycall-peer/1";

const relativeDirectories = Object.freeze({
  bin: "bin",
  debian: "debian",
  docs: "docs",
  examples: "examples",
  scripts: "scripts",
  tests: "tests"
});

function resolvePackagePath(...segments) {
  const resolved = path.resolve(root, path.join(...segments));
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSeparator)) {
    throw new Error(`Path escapes package root: ${segments.join("/")}`);
  }
  return resolved;
}

function listFiles(directoryName) {
  if (!Object.prototype.hasOwnProperty.call(relativeDirectories, directoryName)) {
    throw new Error(`Unknown package directory: ${directoryName}`);
  }
  const start = resolvePackagePath(relativeDirectories[directoryName]);
  if (!fs.existsSync(start)) return [];
  const output = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else output.push(path.relative(root, fullPath).replace(/\\/g, "/"));
    }
  };
  visit(start);
  return output.sort();
}

module.exports = Object.freeze({
  packageName: packageJson.name,
  version: packageJson.version,
  protocol: PROTOCOL,
  polycallCoreUrl: POLYCALL_CORE_URL,
  client: path.join(root, "bin", "curl-polycall"),
  root,
  directories: Object.freeze(Object.fromEntries(
    Object.entries(relativeDirectories).map(([name, relativePath]) => [name, resolvePackagePath(relativePath)])
  )),
  resolve: resolvePackagePath,
  listFiles
});
