# Unix packaging

`curl-polycall` is a single POSIX sh script (`bin/curl-polycall`) that needs
`curl` and coreutils (`base64`, `od`, `wc`, `tr`, `sed`, `head`). There is
nothing to compile and the package is architecture-independent.

## Generic install

```sh
sudo make install PREFIX=/usr
# /usr/bin/curl-polycall
# /usr/share/doc/curl-polycall/{README.md,LICENSE,UNIX_PACKAGING.md}
# /usr/share/curl-polycall/examples/curl.sh
```

`make uninstall PREFIX=/usr` removes the same files.

## Debian / Ubuntu package

```sh
sudo apt install build-essential debhelper devscripts
sh scripts/build-deb.sh
sudo apt install ../curl-polycall_0.2.0_all.deb
```

`sudo apt install curl-polycall` (without a path) works only after the
`.deb` is published to an apt repository configured on the machine; it is
not published.

## Configuration

There is no configuration file. The shared token of the peer group is read
from `POLYCALL_DEV_TOKEN` (or the variable named by `--token-env`) and passed
to curl through its config on stdin, so it does not appear in the process
list.
