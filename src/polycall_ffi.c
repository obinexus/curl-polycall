#define POLYCALL_FFI_EXPORTS
#include "polycall_ffi.h"

#include <stdio.h>
#include <string.h>

static int write_result(char *out_buffer, int out_buffer_len, const char *status, const char *message) {
    if (out_buffer == NULL || out_buffer_len <= 0) {
        return -1;
    }
    int written = snprintf(out_buffer, (size_t)out_buffer_len,
                           "{\"status\":\"%s\",\"message\":\"%s\"}",
                           status, message);
    if (written < 0 || written >= out_buffer_len) {
        return -2;
    }
    return 0;
}

int polycall_verify_command(const char *command, char *out_buffer, int out_buffer_len) {
    if (command == NULL || strlen(command) == 0) {
        return write_result(out_buffer, out_buffer_len, "NO", "empty command");
    }

    /* Verification-first example: accept only a small command vocabulary. */
    if (strcmp(command, "ping") == 0) {
        return write_result(out_buffer, out_buffer_len, "YES", "polycall pong via direct ffi");
    }
    if (strcmp(command, "health") == 0) {
        return write_result(out_buffer, out_buffer_len, "YES", "ffi runtime healthy");
    }

    return write_result(out_buffer, out_buffer_len, "MAYBE", "command not registered");
}

int polycall_runtime_micro_attach(const char *dependency_path, char *out_buffer, int out_buffer_len) {
    if (dependency_path == NULL || strlen(dependency_path) == 0) {
        return write_result(out_buffer, out_buffer_len, "NO", "missing dependency path");
    }

    /* Attach means register/link dependency metadata at runtime; no execution here. */
    return write_result(out_buffer, out_buffer_len, "YES", "micro dependency attached");
}

int polycall_runtime_micro_detach(const char *dependency_path, char *out_buffer, int out_buffer_len) {
    if (dependency_path == NULL || strlen(dependency_path) == 0) {
        return write_result(out_buffer, out_buffer_len, "NO", "missing dependency path");
    }

    return write_result(out_buffer, out_buffer_len, "YES", "micro dependency detached");
}
