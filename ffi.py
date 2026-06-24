"""Direct FFI loader for curl-polycall.

This module intentionally gives the Python side an `import ffi` surface.
It uses ctypes from the Python standard library so no extra dependency is needed.
"""
from __future__ import annotations

import ctypes
import os
import platform
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _default_library_name() -> str:
    system = platform.system().lower()
    if system == "windows":
        return "polycall_ffi.dll"
    if system == "darwin":
        return "libpolycall_ffi.dylib"
    return "libpolycall_ffi.so"


def _default_library_path() -> Path:
    return ROOT / "build" / "bin" / _default_library_name()


class PolycallFFI:
    def __init__(self, library_path: str | os.PathLike[str] | None = None) -> None:
        self.library_path = Path(library_path) if library_path else _default_library_path()
        if not self.library_path.exists():
            raise FileNotFoundError(
                f"FFI library not found: {self.library_path}. Build it first."
            )
        try:
            self.lib = ctypes.CDLL(str(self.library_path))
        except OSError as exc:
            raise OSError(
                f"Unable to load FFI library {self.library_path}: {exc}. "
                "Rebuild it with a compiler target that matches this Python process."
            ) from exc
        self._bind()

    def _bind(self) -> None:
        for name in (
            "polycall_verify_command",
            "polycall_runtime_micro_attach",
            "polycall_runtime_micro_detach",
        ):
            fn = getattr(self.lib, name)
            fn.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
            fn.restype = ctypes.c_int

    def _call(self, fn_name: str, value: str) -> str:
        output = ctypes.create_string_buffer(1024)
        fn = getattr(self.lib, fn_name)
        code = fn(value.encode("utf-8"), output, len(output))
        text = output.value.decode("utf-8", errors="replace")
        if code != 0:
            raise RuntimeError(f"{fn_name} failed with code {code}: {text}")
        return text

    def command(self, command: str) -> str:
        return self._call("polycall_verify_command", command)

    def attach(self, dependency_path: str) -> str:
        return self._call("polycall_runtime_micro_attach", dependency_path)

    def detach(self, dependency_path: str) -> str:
        return self._call("polycall_runtime_micro_detach", dependency_path)


def load(library_path: str | os.PathLike[str] | None = None) -> PolycallFFI:
    return PolycallFFI(library_path)
