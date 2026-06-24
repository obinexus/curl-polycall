$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path build/bin | Out-Null
New-Item -ItemType Directory -Force -Path build/obj | Out-Null

# Requires MSVC Developer PowerShell or cl.exe on PATH.
cl /nologo /LD /Fe:build/bin/polycall_ffi.dll /Fo:build/obj/polycall_ffi.obj src/polycall_ffi.c
Write-Host "Built build/bin/polycall_ffi.dll"
