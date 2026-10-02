#!/usr/bin/env pwsh
# polycall-peer/1 from PowerShell with curl.exe (ships with Windows 10+):
#
#   $env:POLYCALL_DEV_TOKEN = 'secret'
#   polycall peer serve -n beta -e 127.0.0.1:9002      # in another window
#   pwsh examples/curl.ps1 127.0.0.1:9002
param([string]$Node = '127.0.0.1:9002')
$ErrorActionPreference = 'Stop'

$config = New-TemporaryFile
$body = New-TemporaryFile
try {
    # the token goes to curl through a config file, never on the command line
    Set-Content -Path $config -Value "header = `"Authorization: Bearer $($env:POLYCALL_DEV_TOKEN)`"" -NoNewline

    Write-Host '# GET /health'
    curl.exe --silent --show-error "http://$Node/health"
    Write-Host ''

    Write-Host '# POST /receive: hello as message ps-demo-1 from node curl-demo'
    $payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('hello from PowerShell'))
    Set-Content -Path $body -Value "{`"v`":1,`"id`":`"ps-demo-1`",`"from`":`"curl-demo`",`"payload_b64`":`"$payload`"}" -NoNewline
    curl.exe --silent --show-error -K $config -H 'Content-Type: application/json' -H 'Expect:' --data-binary "@$body" "http://$Node/receive"
    if ($LASTEXITCODE -ne 0) { throw "curl exit $LASTEXITCODE" }
    Write-Host ''

    Write-Host '# POST /inbox/next'
    Set-Content -Path $body -Value '{"timeout_ms":1000}' -NoNewline
    $reply = curl.exe --silent --show-error -K $config -H 'Content-Type: application/json' --data-binary "@$body" "http://$Node/inbox/next" | ConvertFrom-Json
    if ($reply.message) {
        $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($reply.message.payload_b64))
        Write-Host "from=$($reply.message.from) id=$($reply.message.id) payload=$text"
    } else {
        Write-Host 'no message'
    }
} finally {
    Remove-Item $config, $body -ErrorAction SilentlyContinue
}
