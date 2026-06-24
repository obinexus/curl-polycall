#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$base = "http://127.0.0.1:8084"

Write-Host "Waiting for curl-polycall at $base ..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    curl.exe --silent --fail "$base/" > $null 2>$null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Milliseconds 500
}

if (-not $ready) {
    throw "curl-polycall is not reachable at $base. Start it with: python .\server.py"
}

$paths = @(
    "/",
    "/command?cmd=ping",
    "/command?cmd=health",
    "/command?cmd=unknown",
    "/micro/attach?path=build/bin/example.nsigii",
    "/micro/detach?path=build/bin/example.nsigii"
)

foreach ($path in $paths) {
    curl.exe --silent --show-error "$base$path"
    Write-Host ""
}
