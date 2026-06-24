CC ?= cc
CFLAGS ?= -O2 -Wall -Wextra -fPIC
SRC := src/polycall_ffi.c
OBJ := build/obj/polycall_ffi.o
BIN := build/bin/libpolycall_ffi.so

.PHONY: all clean dirs run

all: dirs $(BIN)

dirs:
	mkdir -p build/bin build/obj

$(OBJ): $(SRC) src/polycall_ffi.h
	$(CC) $(CFLAGS) -c $(SRC) -o $(OBJ)

$(BIN): $(OBJ)
	$(CC) -shared $(OBJ) -o $(BIN)

run: all
	python3 server.py

clean:
	rm -rf build/bin/* build/obj/*
