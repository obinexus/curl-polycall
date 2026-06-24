ifeq ($(OS),Windows_NT)
ifeq ($(origin CC),default)
CC := gcc
endif
else
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

ifeq ($(OS),Windows_NT)
PIC_FLAGS :=
PYTHON ?= python
LIB := $(BIN_DIR)/polycall_ffi.dll
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

.PHONY: all clean dirs run FORCE

all: dirs $(LIB)

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

$(LIB): $(OBJ) | dirs
	$(CC) $(SHARED_FLAGS) $(OBJ) -o $(LIB)

run: all
	$(PYTHON) server.py

ifeq ($(OS),Windows_NT)
clean:
	@if exist "build\bin\polycall_ffi.dll" del /q "build\bin\polycall_ffi.dll"
	@if exist "build\obj\polycall_ffi.o" del /q "build\obj\polycall_ffi.o"
else
clean:
	rm -rf $(BIN_DIR)/* $(OBJ_DIR)/*
endif
