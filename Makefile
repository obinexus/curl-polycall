# curl-polycall: nothing to compile -- bin/curl-polycall is a POSIX sh
# client of polycall-peer/1 built on curl(1). This Makefile installs it.
#
#   make install [DESTDIR=...] [PREFIX=/usr/local]
#   make test        (needs node >= 20, curl, and a polycall CLI on PATH or $POLYCALL_CLI)

DESTDIR ?=
PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
DOCDIR ?= $(PREFIX)/share/doc/curl-polycall
EXAMPLESDIR ?= $(PREFIX)/share/curl-polycall/examples

.PHONY: all install uninstall test

all:
	@sh -n bin/curl-polycall && echo "bin/curl-polycall: syntax OK (nothing to build)"

install:
	install -d "$(DESTDIR)$(BINDIR)" "$(DESTDIR)$(DOCDIR)" "$(DESTDIR)$(EXAMPLESDIR)"
	install -m 0755 bin/curl-polycall "$(DESTDIR)$(BINDIR)/curl-polycall"
	install -m 0644 README.md LICENSE docs/UNIX_PACKAGING.md "$(DESTDIR)$(DOCDIR)/"
	install -m 0755 examples/curl.sh "$(DESTDIR)$(EXAMPLESDIR)/curl.sh"

uninstall:
	rm -f "$(DESTDIR)$(BINDIR)/curl-polycall"
	rm -rf "$(DESTDIR)$(DOCDIR)" "$(DESTDIR)$(EXAMPLESDIR)"

test:
	npm test
