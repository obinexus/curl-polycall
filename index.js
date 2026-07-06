"use strict";

const fs = require("node:fs");
const path = require("node:path");

const packageJson = require("./package.json");
const root = __dirname;
const releaseHostUrl = "https://github.com/obinexus/libpolycall/releases#release-libpolycall-1.0.0";

const relativeDirectories = Object.freeze({
  bin: "bin",
  build: "build",
  config: "config",
  debian: "debian",
  docs: "docs",
  examples: "examples",
  scripts: "scripts",
  src: "src",
  tests: "tests"
});

function assertInsidePackage(target) {
  const resolved = path.resolve(root, target);
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSeparator)) {
    throw new Error(`Path escapes package root: ${target}`);
  }
  return resolved;
}

function resolvePackagePath(...segments) {
  return assertInsidePackage(path.join(...segments));
}

function listFiles(directoryName) {
  if (!Object.prototype.hasOwnProperty.call(relativeDirectories, directoryName)) {
    throw new Error(`Unknown package directory: ${directoryName}`);
  }

  const start = resolvePackagePath(relativeDirectories[directoryName]);
  if (!fs.existsSync(start)) {
    return [];
  }

  const output = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else {
        output.push(path.relative(root, fullPath).replace(/\\/g, "/"));
      }
    }
  };

  visit(start);
  return output.sort();
}

module.exports = Object.freeze({
  packageName: packageJson.name,
  version: packageJson.version,
  releaseHostUrl,
  libpolycall: Object.freeze({
    release: "1.0.0",
    hostUrl: releaseHostUrl
  }),
  root,
  directories: Object.freeze(
    Object.fromEntries(
      Object.entries(relativeDirectories).map(([name, relativePath]) => [
        name,
        resolvePackagePath(relativePath)
      ])
    )
  ),
  resolve: resolvePackagePath,
  listFiles
});
