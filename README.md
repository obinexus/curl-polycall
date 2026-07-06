# curl-polycall

Minimal direct FFI demonstration for libpolycall-style command interpolation through `curl` or `wget`.

This package targets the libpolycall 1.0.0 host release:

<https://github.com/obinexus/libpolycall/releases#release-libpolycall-1.0.0>

The point of this example is narrow:

- expose a tiny native C ABI;
- load it from Python 3 with `import ffi`;
- serve HTTP endpoints that call the native ABI directly;
- expose portable npm binaries for `npx @obinexusltd/curl-polycall`;
- keep NSIGII as an external attachable artifact, not C code inside libpolycall;
- keep `micro attach` and `micro detach` as runtime dependency registration only.

## Layout

```text
curl-polycall/
|-- bin/
|   |-- curl-polycall.js
|   `-- curl-polycall-server.js
|-- build/
|   |-- bin/
|   `-- obj/
|-- config/
|   `-- curl-polycall.env
|-- debian/
|   |-- control
|   |-- rules
|   `-- source/
|-- docs/
|   |-- FAULT_TOLERANT_FFI_PROOF.md
|   `-- UNIX_PACKAGING.md
|-- examples/
|   |-- curl.ps1
|   `-- curl.sh
|-- scripts/
|   `-- build-windows.ps1
|-- src/
|   |-- polycall_ffi.c
|   `-- polycall_ffi.h
|-- ffi.py
|-- server.py
|-- Makefile
|-- package.json
`-- README.md
```

## npm package metadata

The project root includes `package.json` for the npm package
`@obinexusltd/curl-polycall`. The package metadata now sets the npm homepage and
libpolycall host URL to the libpolycall 1.0.0 release page:

```text
https://github.com/obinexus/libpolycall/releases#release-libpolycall-1.0.0
```

The package metadata lists every source folder in `directories`, keeps generated
native build outputs out of the source package, and preserves `build/bin` and
`build/obj` with `.gitkeep` placeholders.

The package also exposes two CLI entry points via npm:

- `curl-polycall` → `bin/curl-polycall.js`
- `curl-polycall-server` → `bin/curl-polycall-server.js`

The `scripts/*.in` files are still kept for Unix package installation through
`make install`; npm and npx use the portable Node wrappers in `bin/`.

Install globally or run through `npx`:

```sh
npm install -g @obinexusltd/curl-polycall
curl-polycall server
curl-polycall health
curl-polycall command ping
```

Or run directly with `npx`:

```sh
npx @obinexusltd/curl-polycall --help
npx @obinexusltd/curl-polycall server
npx @obinexusltd/curl-polycall health
npx @obinexusltd/curl-polycall command ping
```

The server command starts `server.py` from the package root using `PYTHON` if it
is set, otherwise `python` on Windows and `python3` on Unix-like systems. Client
commands use Node's built-in HTTP stack, so they do not require a system `curl`
binary.

If you want the secondary binary explicitly:

```sh
npx --package @obinexusltd/curl-polycall curl-polycall-server
```

Useful npm scripts:

```sh
npm run build
npm test
npm run build:deb
npm run build:windows
npm start
npm run demo
npm run demo:windows
npm run test:ffi
```

## Native ABI

```c
int polycall_verify_command(const char *command, char *out_buffer, int out_buffer_len);
int polycall_runtime_micro_attach(const char *dependency_path, char *out_buffer, int out_buffer_len);
int polycall_runtime_micro_detach(const char *dependency_path, char *out_buffer, int out_buffer_len);
```

Platform outputs:

- Windows: `build/bin/polycall_ffi.dll`
- Linux: `build/bin/libpolycall_ffi.so`
- macOS: `build/bin/libpolycall_ffi.dylib`
- Objects: `build/obj`

These files are build products. The npm package includes source, scripts,
configuration, docs, examples, npm bin wrappers, and `.gitkeep` placeholders for
`build/bin` and `build/obj`; it does not ship stale compiled binaries.

## Build

Linux/macOS:

```sh
make
python3 server.py
```

Windows PowerShell:

```powershell
.\scripts\build-windows.ps1
python server.py
```

If Windows reports `cannot open file 'build\bin\polycall_ffi.dll'` or
`Permission denied`, stop the running server with `Ctrl+C` before rebuilding.
Python keeps the DLL loaded while `server.py` is running.

## Unix and apt install

For generic Unix installs:

```sh
make
sudo make install PREFIX=/usr SYSCONFDIR=/etc
```

For Debian/Ubuntu local apt installs:

```sh
sudo apt update
sudo apt install build-essential debhelper devscripts
chmod +x debian/rules scripts/build-deb.sh
sh scripts/build-deb.sh
sudo apt install ../curl-polycall_0.1.0_$(dpkg --print-architecture).deb
```

Then run:

```sh
curl-polycall server
curl-polycall health
curl-polycall command ping
```

Plain `sudo apt install curl-polycall` works only after the `.deb` is published
to an apt repository configured on the machine. See
[docs/UNIX_PACKAGING.md](docs/UNIX_PACKAGING.md).

## Direct Python FFI

```python
import ffi

runtime = ffi.load()
runtime.command("ping")
runtime.attach("build/bin/example.nsigii")
runtime.detach("build/bin/example.nsigii")
```

## Curl endpoints

Start the server first:

```sh
python server.py
```

Then call individual endpoints:

```sh
curl "http://127.0.0.1:8084/"
curl "http://127.0.0.1:8084/command?cmd=ping"
curl "http://127.0.0.1:8084/command?cmd=health"
curl "http://127.0.0.1:8084/command?cmd=unknown"
curl "http://127.0.0.1:8084/micro/attach?path=build/bin/example.nsigii"
curl "http://127.0.0.1:8084/micro/detach?path=build/bin/example.nsigii"
```

Or run the example script:

```sh
bash examples/curl.sh
```

From PowerShell:

```powershell
.\examples\curl.ps1
```

Both example scripts wait briefly for `http://127.0.0.1:8084/` before sending
the endpoint requests, so they can be launched while `server.py` is still
starting.

Do not run `curl.exe examples/curl.sh`; that asks curl to fetch a URL named
`examples/curl.sh`. Use `bash examples/curl.sh` or the PowerShell script above.

Each response is trinary JSON:

```json
{"status":"YES","message":"..."}
{"status":"NO","message":"..."}
{"status":"MAYBE","message":"..."}
```

Known commands return `YES`, invalid input returns `NO`, and unknown but syntactically valid commands return `MAYBE`.
