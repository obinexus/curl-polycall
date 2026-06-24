# curl-polycall

Minimal direct FFI demonstration for libpolycall-style command interpolation through `curl` or `wget`.

The point of this example is narrow:

- expose a tiny native C ABI;
- load it from Python 3 with `import ffi`;
- serve HTTP endpoints that call the native ABI directly;
- keep NSIGII as an external attachable artifact, not C code inside libpolycall;
- keep `micro attach` and `micro detach` as runtime dependency registration only.

## Layout

```text
curl-polycall/
|-- build/
|   |-- bin/
|   `-- obj/
|-- docs/
|   `-- FAULT_TOLERANT_FFI_PROOF.md
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
`@obinexusltd/curl-polycall`. The package metadata lists every source folder in
`directories` and keeps generated native build outputs out of the source package
while preserving `build/bin` and `build/obj` with `.gitkeep` placeholders.

Useful npm scripts:

```sh
npm run build
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

Do not run `curl.exe examples/curl.sh`; that asks curl to fetch a URL named
`examples/curl.sh`. Use `bash examples/curl.sh` or the PowerShell script above.

Each response is trinary JSON:

```json
{"status":"YES","message":"..."}
{"status":"NO","message":"..."}
{"status":"MAYBE","message":"..."}
```

Known commands return `YES`, invalid input returns `NO`, and unknown but syntactically valid commands return `MAYBE`.
