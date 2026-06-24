# Fault-Tolerant Direct FFI Proof

## Scope

`curl-polycall` proves only the direct Foreign Function Interface boundary.

It does not implement NSIGII as `nsigii.h` or `nsigii.c` inside libpolycall. It does not implement a DOP adapter. It does not copy microvm example code. NSIGII remains an external proof, artifact, or dependency that can be attached, detached, inspected, or loaded later by a runtime.

## Direct FFI Call Chain

The call chain is:

```text
curl/wget
-> Python 3 http.server endpoint
-> import ffi
-> ctypes.CDLL(...)
-> native C ABI function
-> bounded JSON response buffer
```

The Python host performs a real foreign function call into the native shared library. The HTTP server is only a transport surface for command-line interoperability.

## Native ABI Boundary

The exported ABI is exactly:

```c
int polycall_verify_command(const char *command, char *out_buffer, int out_buffer_len);
int polycall_runtime_micro_attach(const char *dependency_path, char *out_buffer, int out_buffer_len);
int polycall_runtime_micro_detach(const char *dependency_path, char *out_buffer, int out_buffer_len);
```

Each function accepts caller-owned input plus a bounded output buffer. The C implementation writes responses with `snprintf`, checks truncation, and returns an error code if the buffer is invalid or too small.

## Why NSIGII Is Not Embedded

NSIGII is treated as an external artifact because libpolycall's responsibility here is native ABI interoperability, not NSIGII protocol logic. Embedding NSIGII directly as C headers or C source would collapse two separate concerns:

- libpolycall: command interpolation, ABI boundary, language interop, runtime dependency attachment;
- NSIGII: external proof/artifact/dependency semantics.

Keeping NSIGII outside the native demo preserves the ability to attach, detach, inspect, or replace artifacts without rebuilding libpolycall.

## Attach/Detach Is Separate From Execution

`polycall_runtime_micro_attach` and `polycall_runtime_micro_detach` register dependency paths only. They do not load, invoke, fork, evaluate, or execute the dependency.

This preserves a linkable-then-executable model: attachment establishes that a runtime dependency may be known to the runtime; execution remains a later, explicit phase outside this minimal proof.

## Trinary Verification Model

The response model is trinary:

- `YES`: the command or dependency operation is accepted.
- `NO`: the input is invalid, empty, or unsafe for registration.
- `MAYBE`: the command is syntactically valid but not registered.

This maps to verification-first command processing. The server never executes command strings. It asks the native ABI to verify the command, then returns the verification result.

## Distributed Command-Line Interoperability

`curl` and `wget` provide distributed command-line entry points:

```sh
curl "http://127.0.0.1:8084/command?cmd=ping"
wget -qO- "http://127.0.0.1:8084/command?cmd=health"
```

The HTTP layer can be reached by ordinary command-line tools, while the actual decision boundary remains the native FFI call. That gives the demo a minimal decentralized shape: remote text request in, verification-first native ABI decision out.
