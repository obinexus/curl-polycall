# Unix Packaging And Apt Install

## What apt can and cannot do

`sudo apt install curl-polycall` only works after `curl-polycall` has been
published into an apt repository that the machine knows about.

For local development, build a `.deb` first and install it with:

```sh
sudo apt install ./curl-polycall_0.1.0_$(dpkg --print-architecture).deb
```

## Standard Unix Layout

The package follows the Filesystem Hierarchy Standard:

```text
/usr/bin/curl-polycall
/usr/bin/curl-polycall-server
/usr/lib/curl-polycall/
/usr/lib/curl-polycall/build/bin/libpolycall_ffi.so
/etc/curl-polycall/curl-polycall.env
/usr/share/doc/curl-polycall/
/usr/share/curl-polycall/examples/
```

Runtime config is read from `/etc/curl-polycall/curl-polycall.env`:

```sh
CURL_POLYCALL_HOST=127.0.0.1
CURL_POLYCALL_PORT=8084
```

## Debian/Ubuntu Local Package

Install build tools:

```sh
sudo apt update
sudo apt install build-essential debhelper devscripts
```

Build the Debian package:

```sh
chmod +x debian/rules scripts/build-deb.sh
sh scripts/build-deb.sh
```

Install the local package:

```sh
sudo apt install ../curl-polycall_0.1.0_$(dpkg --print-architecture).deb
```

Use the installed commands:

```sh
curl-polycall server
curl-polycall health
curl-polycall command ping
curl-polycall command unknown
curl-polycall attach build/bin/example.nsigii
curl-polycall detach build/bin/example.nsigii
```

## Generic Unix Install

For Unix-like systems without apt:

```sh
make
sudo make install PREFIX=/usr SYSCONFDIR=/etc
```

Remove:

```sh
sudo make uninstall PREFIX=/usr SYSCONFDIR=/etc
```

## Local Apt Repository

After building the `.deb`, create a tiny local apt repository:

```sh
mkdir -p ~/apt-repo
cp ../curl-polycall_0.1.0_$(dpkg --print-architecture).deb ~/apt-repo/
cd ~/apt-repo
dpkg-scanpackages . /dev/null | gzip -9c > Packages.gz
echo "deb [trusted=yes] file:$HOME/apt-repo ./" | sudo tee /etc/apt/sources.list.d/curl-polycall-local.list
sudo apt update
sudo apt install curl-polycall
```

That is the step that makes plain `sudo apt install curl-polycall` work on a
machine.
