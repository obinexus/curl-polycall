$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path build/bin | Out-Null
New-Item -ItemType Directory -Force -Path build/obj | Out-Null
Remove-Item -Force -ErrorAction SilentlyContinue `
    build/bin/polycall_ffi.tmp.dll, `
    build/obj/polycall_ffi.tmp.o

function Test-LastExitCode {
    param([string]$Label)
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

function Move-BuiltDll {
    try {
        if (Test-Path build/bin/polycall_ffi.dll) {
            Remove-Item -Force build/bin/polycall_ffi.dll
        }
        Move-Item -Force build/bin/polycall_ffi.tmp.dll build/bin/polycall_ffi.dll
    } catch {
        Remove-Item -Force -ErrorAction SilentlyContinue build/bin/polycall_ffi.tmp.dll
        throw "Cannot replace build/bin/polycall_ffi.dll. Stop the running Python server first because Windows keeps loaded DLLs locked. Original error: $($_.Exception.Message)"
    }
}

$clCommand = "cl /nologo /W4 /O2 /LD /Fe:build\bin\polycall_ffi.tmp.dll /Fo:build\obj\polycall_ffi.obj src\polycall_ffi.c /link /IMPLIB:build\obj\polycall_ffi.lib /PDB:build\obj\polycall_ffi.pdb"
$vcvarsCandidates = @(
    "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat",
    "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
)

foreach ($vcvars in $vcvarsCandidates) {
    if (Test-Path $vcvars) {
        $cmd = "`"$vcvars`" >nul && $clCommand"
        cmd.exe /d /s /c $cmd
        Test-LastExitCode "MSVC x64 build"
        Move-BuiltDll
        Write-Host "Built build/bin/polycall_ffi.dll with MSVC x64"
        exit 0
    }
}

if ($env:INCLUDE -and $env:LIB -and (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    cl /nologo /W4 /O2 /LD /Fe:build\bin\polycall_ffi.tmp.dll /Fo:build\obj\polycall_ffi.obj src\polycall_ffi.c /link /IMPLIB:build\obj\polycall_ffi.lib /PDB:build\obj\polycall_ffi.pdb
    Test-LastExitCode "MSVC build"
    Move-BuiltDll
    Write-Host "Built build/bin/polycall_ffi.dll with MSVC"
    exit 0
}

if (Get-Command gcc.exe -ErrorAction SilentlyContinue) {
    $target = (gcc -dumpmachine).Trim()
    if ($target -match "mingw32") {
        Write-Warning "GCC target '$target' is commonly 32-bit; the DLL may not load into 64-bit Python."
    }
    gcc -O2 -Wall -Wextra -c src/polycall_ffi.c -o build/obj/polycall_ffi.tmp.o
    Test-LastExitCode "GCC compile"
    gcc -shared build/obj/polycall_ffi.tmp.o -o build/bin/polycall_ffi.tmp.dll
    Test-LastExitCode "GCC link"
    Move-Item -Force build/obj/polycall_ffi.tmp.o build/obj/polycall_ffi.o
    Move-BuiltDll
    Write-Host "Built build/bin/polycall_ffi.dll with GCC"
    exit 0
}

throw "No Windows C compiler found. Install Visual Studio Build Tools or MinGW GCC."
