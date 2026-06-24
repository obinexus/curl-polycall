# curl-polycall

Minimal viable example for direct libpolycall-style FFI calls from a curl/wget endpoint.

## Purpose

This project demonstrates:

- direct FFI only;
- Python 3 server using `import ffi`;
- native shared library loaded at runtime;
- `curl`/`wget` command-line interoperability;
- build output moved to `build/bin` and object output moved to `build/obj`;
- `micro {attach, detach}` as runtime dependency operations;
- no `nsigii.h` / `nsigii.c` implementation inside libpolycall;
- no DOP adapter.

## Layout

```text
curl-polycall/
├── build/
│   ├── bin/        # shared library output
│   └── obj/        # object output
├── docs/
│   └── FAULT_TOLERANT_FFI_PROOF.md
├── examples/
│   └── curl.sh
├── scripts/
│   └── build-windows.ps1
├── src/
│   ├── polycall_ffi.c
│   └── polycall_ffi.h
├── ffi.py
├── server.py
└── Makefile
```

## Linux/macOS build

```bash
make
python3 server.py
```

## Windows build

Open **Developer PowerShell for Visual Studio**:

```powershell
.\scripts\build-windows.ps1
python server.py
```

## Test with curl

```bash
curl "http://127.0.0.1:8084/command?cmd=ping"
curl "http://127.0.0.1:8084/command?cmd=unknown"
curl "http://127.0.0.1:8084/micro/attach?path=build/bin/example.nsigii"
curl "http://127.0.0.1:8084/micro/detach?path=build/bin/example.nsigii"
```

## Test with wget

```bash
wget -qO- "http://127.0.0.1:8084/command?cmd=health"
```

## Direct FFI boundary

The C ABI is intentionally small:

```c
int polycall_verify_command(const char *command, char *out_buffer, int out_buffer_len);
int polycall_runtime_micro_attach(const char *dependency_path, char *out_buffer, int out_buffer_len);
int polycall_runtime_micro_detach(const char *dependency_path, char *out_buffer, int out_buffer_len);
```

This keeps libpolycall as the transport/interop layer. NSIGII can be attached as an external artifact but must not be implemented directly inside libpolycall.
