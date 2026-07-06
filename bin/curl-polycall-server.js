#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");

function usage() {
  process.stdout.write(`Usage:
  curl-polycall-server [server.py args...]

Environment:
  CURL_POLYCALL_HOST  Server bind host, default 127.0.0.1
  CURL_POLYCALL_PORT  Server bind port, default 8084
  PYTHON              Python executable, default python on Windows and python3 elsewhere
`);
}

function pythonExecutable() {
  return process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

const child = spawn(pythonExecutable(), [path.join(packageRoot, "server.py"), ...args], {
  cwd: packageRoot,
  env: process.env,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(`curl-polycall-server: failed to start Python server: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code === null ? 1 : code);
});
