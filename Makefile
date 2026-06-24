ifneq ($(OS),Windows_NT)
ifeq ($(origin CC),default)
CC := cc
endif
endif
CFLAGS ?= -O2 -Wall -Wextra
PIC_FLAGS ?= -fPIC

SRC := src/polycall_ffi.c
OBJ_DIR := build/obj
BIN_DIR := build/bin
OBJ := $(OBJ_DIR)/polycall_ffi.o

DESTDIR ?=
PREFIX ?= /usr/local
SYSCONFDIR ?= /etc
BINDIR ?= $(PREFIX)/bin
LIBEXECDIR ?= $(PREFIX)/lib/curl-polycall
DOCDIR ?= $(PREFIX)/share/doc/curl-polycall
EXAMPLESDIR ?= $(PREFIX)/share/curl-polycall/examples

ifeq ($(OS),Windows_NT)
PIC_FLAGS :=
PYTHON ?= python
LIB := $(BIN_DIR)/polycall_ffi.dll
TMP_LIB := $(BIN_DIR)/polycall_ffi.tmp.dll
SHARED_FLAGS := -shared
else
PYTHON ?= python3
UNAME_S := $(shell uname -s 2>/dev/null || echo Unknown)
ifeq ($(UNAME_S),Darwin)
LIB := $(BIN_DIR)/libpolycall_ffi.dylib
SHARED_FLAGS := -dynamiclib
else
LIB := $(BIN_DIR)/libpolycall_ffi.so
SHARED_FLAGS := -shared
endif
endif

.PHONY: all clean dirs install uninstall run windows-build FORCE

ifeq ($(OS),Windows_NT)
all: windows-build
else
all: dirs $(LIB)
endif

FORCE:

ifeq ($(OS),Windows_NT)
dirs:
	@if not exist "build" mkdir "build"
	@if not exist "build\bin" mkdir "build\bin"
	@if not exist "build\obj" mkdir "build\obj"
else
dirs:
	mkdir -p $(BIN_DIR) $(OBJ_DIR)
endif

$(OBJ): FORCE $(SRC) src/polycall_ffi.h | dirs
	$(CC) $(CFLAGS) $(PIC_FLAGS) -c $(SRC) -o $(OBJ)

ifeq ($(OS),Windows_NT)
windows-build: dirs
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows.ps1
else
$(LIB): $(OBJ) | dirs
	$(CC) $(SHARED_FLAGS) $(OBJ) -o $(LIB)
endif

run: all
	$(PYTHON) server.py

ifeq ($(OS),Windows_NT)
install:
	@echo "make install is only supported on Unix-like systems"
	@exit 1

uninstall:
	@echo "make uninstall is only supported on Unix-like systems"
	@exit 1
else
install: all
	install -d "$(DESTDIR)$(BINDIR)"
	install -d "$(DESTDIR)$(LIBEXECDIR)"
	install -d "$(DESTDIR)$(LIBEXECDIR)/build/bin"
	install -d "$(DESTDIR)$(SYSCONFDIR)/curl-polycall"
	install -d "$(DESTDIR)$(DOCDIR)"
	install -d "$(DESTDIR)$(EXAMPLESDIR)"
	install -m 0644 ffi.py server.py "$(DESTDIR)$(LIBEXECDIR)/"
	install -m 0644 "$(LIB)" "$(DESTDIR)$(LIBEXECDIR)/build/bin/"
	install -m 0644 config/curl-polycall.env "$(DESTDIR)$(SYSCONFDIR)/curl-polycall/curl-polycall.env"
	install -m 0644 README.md LICENSE "$(DESTDIR)$(DOCDIR)/"
	install -m 0644 docs/FAULT_TOLERANT_FFI_PROOF.md "$(DESTDIR)$(DOCDIR)/"
	install -m 0755 examples/curl.sh "$(DESTDIR)$(EXAMPLESDIR)/curl.sh"
	sed -e 's|@LIBEXECDIR@|$(LIBEXECDIR)|g' \
		-e 's|@SYSCONFDIR@|$(SYSCONFDIR)|g' \
		scripts/curl-polycall-server.in > "$(DESTDIR)$(BINDIR)/curl-polycall-server"
	chmod 0755 "$(DESTDIR)$(BINDIR)/curl-polycall-server"
	sed -e 's|@BINDIR@|$(BINDIR)|g' \
		-e 's|@EXAMPLESDIR@|$(EXAMPLESDIR)|g' \
		scripts/curl-polycall.in > "$(DESTDIR)$(BINDIR)/curl-polycall"
	chmod 0755 "$(DESTDIR)$(BINDIR)/curl-polycall"

uninstall:
	rm -f "$(DESTDIR)$(BINDIR)/curl-polycall" "$(DESTDIR)$(BINDIR)/curl-polycall-server"
	rm -rf "$(DESTDIR)$(LIBEXECDIR)"
	rm -rf "$(DESTDIR)$(DOCDIR)"
	rm -rf "$(DESTDIR)$(EXAMPLESDIR)"
	rm -f "$(DESTDIR)$(SYSCONFDIR)/curl-polycall/curl-polycall.env"
	rmdir "$(DESTDIR)$(SYSCONFDIR)/curl-polycall" 2>/dev/null || true
endif

ifeq ($(OS),Windows_NT)
clean:
	@if exist "build\bin\polycall_ffi.dll" del /q "build\bin\polycall_ffi.dll"
	@if exist "build\bin\polycall_ffi.tmp.dll" del /q "build\bin\polycall_ffi.tmp.dll"
	@if exist "build\obj\polycall_ffi.o" del /q "build\obj\polycall_ffi.o"
else
clean:
	rm -rf $(BIN_DIR)/* $(OBJ_DIR)/*
endif
