#!/usr/bin/env sh
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

Debian package build complete.

Install locally with:
  sudo apt install ../curl-polycall_0.1.0_$(dpkg --print-architecture).deb

After install:
  curl-polycall server
  curl-polycall health
  curl-polycall command ping
MSG
