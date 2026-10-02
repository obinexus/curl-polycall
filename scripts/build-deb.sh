#!/usr/bin/env sh
# Build the architecture-independent Debian package (../curl-polycall_<ver>_all.deb).
set -eu

if ! command -v dpkg-buildpackage >/dev/null 2>&1; then
    cat >&2 <<'MSG'
dpkg-buildpackage was not found.

Install the Debian packaging toolchain first:
  sudo apt update
  sudo apt install build-essential debhelper devscripts
MSG
    exit 1
fi

dpkg-buildpackage -us -uc -b

cat <<'MSG'

Debian package build complete. Install it with:
  sudo apt install ../curl-polycall_0.2.0_all.deb

Then, against a running peer node:
  curl-polycall health --to 127.0.0.1:9002
MSG
