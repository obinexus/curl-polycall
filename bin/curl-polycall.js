#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const packageJson = require(path.join(packageRoot, "package.json"));
const defaultBaseUrl = "http://127.0.0.1:8084";

function usage(stream = process.stdout) {
  stream.write(`Usage:
  curl-polycall server [server.py args...]
  curl-polycall health
  curl-polycall command [ping|health|unknown]
  curl-polycall attach PATH
  curl-polycall detach PATH
  curl-polycall demo
  curl-polycall --version

Environment:
  CURL_POLYCALL_URL   Base URL for client commands, default ${defaultBaseUrl}
  CURL_POLYCALL_HOST  Server bind host, default 127.0.0.1
  CURL_POLYCALL_PORT  Server bind port, default 8084
  PYTHON              Python executable for the server, default python on Windows and python3 elsewhere

libpolycall host:
  ${packageJson.libpolycall.hostUrl}
`);
}

function pythonExecutable() {
  return process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
}

function runServer(args) {
  const child = spawn(pythonExecutable(), [path.join(packageRoot, "server.py"), ...args], {
    cwd: packageRoot,
    env: process.env,
    stdio: "inherit"
  });

  child.on("error", (error) => {
    console.error(`curl-polycall: failed to start Python server: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code === null ? 1 : code);
  });
}

function endpointUrl(endpoint) {
  const base = process.env.CURL_POLYCALL_URL || defaultBaseUrl;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(endpoint.replace(/^\//, ""), normalizedBase);
}

function request(endpoint) {
  const target = endpointUrl(endpoint);
  const client = target.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(target, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          return;
        }
        process.stdout.write(body);
        if (!body.endsWith("\n")) {
          process.stdout.write("\n");
        }
        resolve();
      });
    });

    req.on("error", (error) => {
      reject(new Error(`${target.href} is not reachable (${error.message}). Start the server with: curl-polycall server`));
    });
  });
}

async function demo() {
  const endpoints = [
    "/",
    "/command?cmd=ping",
    "/command?cmd=health",
    "/command?cmd=unknown",
    "/micro/attach?path=build%2Fbin%2Fexample.nsigii",
    "/micro/detach?path=build%2Fbin%2Fexample.nsigii"
  ];

  for (const endpoint of endpoints) {
    await request(endpoint);
  }
}

async function main(argv) {
  const [command = "help", ...args] = argv;

  switch (command) {
    case "server":
      runServer(args);
      return;
    case "health":
      await request("/");
      return;
    case "command":
      await request(`/command?cmd=${encodeURIComponent(args[0] || "ping")}`);
      return;
    case "attach":
      if (!args[0]) {
        throw new Error("curl-polycall attach requires a dependency path");
      }
      await request(`/micro/attach?path=${encodeURIComponent(args[0])}`);
      return;
    case "detach":
      if (!args[0]) {
        throw new Error("curl-polycall detach requires a dependency path");
      }
      await request(`/micro/detach?path=${encodeURIComponent(args[0])}`);
      return;
    case "demo":
      await demo();
      return;
    case "--version":
    case "-v":
      process.stdout.write(`${packageJson.version}\n`);
      return;
    case "help":
    case "--help":
    case "-h":
      usage();
      return;
    default:
      usage(process.stderr);
      throw new Error(`unknown command: ${command}`);
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`curl-polycall: ${error.message}`);
  process.exit(1);
});
