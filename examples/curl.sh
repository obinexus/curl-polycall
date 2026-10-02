#!/bin/sh
# polycall-peer/1 with nothing but curl: the raw requests bin/curl-polycall
# makes, against a running Polycall peer node.
#
#   POLYCALL_DEV_TOKEN=secret polycall peer serve -n beta -e 127.0.0.1:9002 &
#   POLYCALL_DEV_TOKEN=secret sh examples/curl.sh 127.0.0.1:9002
set -eu

node=${1:-127.0.0.1:9002}
auth="Authorization: Bearer ${POLYCALL_DEV_TOKEN:-}"

echo "# GET /health (no token needed)"
curl --silent --show-error "http://$node/health"
echo

echo "# POST /receive: deliver 'hello' as message demo-1 from node 'curl-demo'"
payload=$(printf 'hello' | base64 | tr -d '\r\n')
printf '%s\n' "header = \"$auth\"" | curl --silent --show-error -K - -H 'Content-Type: application/json' -H 'Expect:' \
    --data-binary "{\"v\":1,\"id\":\"demo-1\",\"from\":\"curl-demo\",\"payload_b64\":\"$payload\"}" \
    "http://$node/receive"
echo

echo "# POST /inbox/next: take the oldest message (wait up to 1 s)"
printf '%s\n' "header = \"$auth\"" | curl --silent --show-error -K - -H 'Content-Type: application/json' \
    --data-binary '{"timeout_ms":1000}' "http://$node/inbox/next"
echo

echo "# the same through the client"
curl_polycall=$(dirname "$0")/../bin/curl-polycall
sh "$curl_polycall" send --to "$node" --from curl-demo --id demo-2 --payload 'hello again'
sh "$curl_polycall" recv --to "$node" -t 1000
