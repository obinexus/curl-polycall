#!/usr/bin/env sh
set -eu
base="http://127.0.0.1:8084"

printf 'Waiting for curl-polycall at %s ...\n' "$base"
ready=0
i=0
while [ "$i" -lt 30 ]; do
    if curl --silent --fail --output /dev/null "$base/"; then
        ready=1
        break
    fi
    i=$((i + 1))
    sleep 0.5
done

if [ "$ready" -ne 1 ]; then
    printf 'curl-polycall is not reachable at %s. Start it with: python server.py\n' "$base" >&2
    exit 1
fi

curl --silent --show-error "$base/"
printf '\n'
curl --silent --show-error "$base/command?cmd=ping"
printf '\n'
curl --silent --show-error "$base/command?cmd=health"
printf '\n'
curl --silent --show-error "$base/command?cmd=unknown"
printf '\n'
curl --silent --show-error "$base/micro/attach?path=build/bin/example.nsigii"
printf '\n'
curl --silent --show-error "$base/micro/detach?path=build/bin/example.nsigii"
printf '\n'
