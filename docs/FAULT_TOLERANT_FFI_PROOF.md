# Fault-Tolerant Direct FFI Proof Sketch

## Scope

This proof concerns only the direct FFI boundary used by `curl-polycall`.
It does not implement NSIGII protocol logic as `nsigii.h` or `nsigii.c` inside libpolycall.
It does not implement a DOP adapter.

## Claim

For every HTTP command request, the server performs a verification-first direct FFI call into a native shared library and returns one of three bounded states:

- `YES`: the command is known and accepted.
- `NO`: the command or dependency is invalid.
- `MAYBE`: the command is syntactically valid but not registered.

## Invariants

1. The Python server never executes arbitrary command strings.
2. The C ABI exposes bounded functions only: command verification, micro attach, micro detach.
3. The output buffer length is supplied by the caller and checked by the callee.
4. Micro attach/detach registers dependency state conceptually; it does not execute the attached binary.
5. NSIGII artifacts may be loaded as external dependencies, but their logical implementation remains outside libpolycall.

## Fault tolerance model

- Missing dependency path returns `NO`.
- Unknown command returns `MAYBE`.
- Runtime FFI load failure fails before serving traffic.
- Buffer overflow is avoided by bounded `snprintf` writes.

## Distributed mapping

`curl` or `wget` is the external network caller.
The Python HTTP server is the language-native host.
The C shared library is the stable ABI boundary.
External artifacts such as `.nsigii`, `.so`, `.dll`, or `.a` are micro attachable dependencies, not embedded protocol logic.

This preserves linkable-then-executable design: dependency attachment is separate from execution.
