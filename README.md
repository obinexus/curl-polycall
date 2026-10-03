# curl-polycall

A **curl(1)-based client of Polycall peer nodes**. `bin/curl-polycall` is a
POSIX sh script that speaks [polycall-peer/1](https://github.com/obinexus/polycall/blob/main/docs/PEER_PROTOCOL.md)
(HTTP/1.1 + JSON) with `curl` to any running node -- `polycall peer serve`,
a program using the C library's `polycall_peer_*` API, or another
conforming implementation -- in the [Polycall core](https://github.com/obinexus/polycall).

It needs only `sh`, `curl` and coreutils (`base64`, `od`, `wc`, `tr`,
`sed`, `head`). It does not link or bundle libpolycall.

> Earlier versions built their own `polycall_ffi` library whose exported
> names (`polycall_runtime_micro_attach`, ...) squatted on the core's
> `polycall_*` prefix, served it from a Python HTTP server, and committed the
> compiled `.so`/`.dll`/`.o` files. All of that is removed; nothing in this
> package defines `polycall_*` symbols.

## Usage

```sh
export POLYCALL_DEV_TOKEN=...            # the peer group's shared token (if the node has one)

curl-polycall health   --to 127.0.0.1:9002 [--expect-node beta]
curl-polycall peers    --to 127.0.0.1:9002
curl-polycall register --to 127.0.0.1:9002 --id alpha --peer-endpoint 127.0.0.1:9001
curl-polycall send     --to 127.0.0.1:9002 --from alpha --id m-1 --payload 'hello'
curl-polycall send     --to 127.0.0.1:9002 --payload-file image.png --expect-node beta
curl-polycall recv     --to 127.0.0.1:9002 -t 5000          # JSON line: from, id, bytes, payload_b64
curl-polycall recv     --to 127.0.0.1:9002 --raw > out.bin  # exact payload bytes
```

* `send` makes **exactly one** delivery attempt (`POST /receive`) and
  succeeds only on the receiver's acknowledgement of the same message id
  (and, with `--expect-node`, under that node id). Retry with the **same**
  `--id` after a timeout or busy answer; the receiver drops duplicates.
  Payloads are binary-safe, at most 1 MiB (larger -> exit 2 before any I/O).
* `recv` takes the oldest message from the node's inbox
  (`POST /inbox/next`, `-t` 0..30000 ms).
* The token is read from `POLYCALL_DEV_TOKEN` (or `--token-env NAME`) and
  given to curl through its config on stdin -- never on a command line.

Exit codes follow the `polycall peer` CLI: `0` ok, `1` busy / refused /
remote error, `2` usage or payload too large, `5` transport or protocol
(unreachable, not a polycall node, wrong identity), `6` deadline / no
message, `7` authentication.

`examples/curl.sh` shows the raw curl requests; `examples/curl.ps1` does the
same from PowerShell with `curl.exe`.

## Install

```sh
sudo make install PREFIX=/usr          # /usr/bin/curl-polycall
sh scripts/build-deb.sh                # Debian package (architecture: all)
npm install curl-polycall # npm bin wrapper (needs sh on PATH; not yet published)
```

See [docs/UNIX_PACKAGING.md](docs/UNIX_PACKAGING.md).

## Tests

```sh
npm test
```

`tests/peer.test.js` runs `curl-polycall` against real `polycall peer serve`
nodes: payloads (empty, UTF-8, binary with NUL, exactly 1 MiB, 1 MiB + 1) in
both directions with bytes, sender id and message id checked at the
receiver, payload files under non-ASCII paths, duplicates, registry
ownership, auth failures, dead peers, wrong identity, timeouts (and `-t 0`
polling), concurrent senders and backpressure. `tests/examples.test.js`
runs `examples/curl.sh` and, on Windows, `examples/curl.ps1` under every
PowerShell found (pwsh 7, Windows PowerShell 5.1) against a real node.
Without `sh`, `curl`, `base64` or a `polycall` CLI (`POLYCALL_CLI` or
`PATH`) those suites are reported as **skipped** with the reason
(`CURL_POLYCALL_REQUIRE_TOOLS=1`, or a `POLYCALL_CLI` that does not exist,
makes that a failure).

## License

MIT -- see [LICENSE](LICENSE).
