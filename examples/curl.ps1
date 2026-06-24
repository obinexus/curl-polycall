#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$base = "http://127.0.0.1:8084"
$paths = @(
    "/",
    "/command?cmd=ping",
    "/command?cmd=health",
    "/command?cmd=unknown",
    "/micro/attach?path=build/bin/example.nsigii",
    "/micro/detach?path=build/bin/example.nsigii"
)

foreach ($path in $paths) {
    curl.exe "$base$path"
    Write-Host ""
}
