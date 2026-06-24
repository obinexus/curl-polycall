from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

import ffi

runtime: ffi.PolycallFFI | None = None


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(payload.encode("utf-8"))

    def do_GET(self) -> None:
        if runtime is None:
            self._send_json(json.dumps({"status": "NO", "message": "ffi runtime not loaded"}), 500)
            return

        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        try:
            if parsed.path == "/":
                return self._send_json(json.dumps({
                    "status": "YES",
                    "message": "curl-polycall direct ffi server",
                    "endpoints": [
                        "/command?cmd=ping",
                        "/command?cmd=health",
                        "/command?cmd=unknown",
                        "/micro/attach?path=build/bin/example.nsigii",
                        "/micro/detach?path=build/bin/example.nsigii"
                    ]
                }))

            if parsed.path == "/command":
                command = query.get("cmd", [""])[0]
                return self._send_json(runtime.command(command))

            if parsed.path == "/micro/attach":
                dep = query.get("path", [""])[0]
                return self._send_json(runtime.attach(dep))

            if parsed.path == "/micro/detach":
                dep = query.get("path", [""])[0]
                return self._send_json(runtime.detach(dep))

            self._send_json(json.dumps({"status": "NO", "message": "unknown endpoint"}), 404)
        except Exception as exc:
            self._send_json(json.dumps({"status": "NO", "message": str(exc)}), 500)


def main() -> None:
    global runtime

    host = "127.0.0.1"
    port = 8084
    try:
        runtime = ffi.load()
    except Exception as exc:
        raise SystemExit(f"curl-polycall FFI load failed before serving: {exc}") from exc

    print(f"curl-polycall serving http://{host}:{port}")
    try:
        HTTPServer((host, port), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\ncurl-polycall stopped", file=sys.stderr)


if __name__ == "__main__":
    main()
