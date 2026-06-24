from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

import ffi

runtime = ffi.load()


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(payload.encode("utf-8"))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        try:
            if parsed.path == "/command":
                command = query.get("cmd", ["health"])[0]
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
    host = "127.0.0.1"
    port = 8084
    print(f"curl-polycall serving http://{host}:{port}")
    HTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
