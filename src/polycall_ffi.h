#ifndef POLYCALL_FFI_H
#define POLYCALL_FFI_H

#ifdef _WIN32
  #ifdef POLYCALL_FFI_EXPORTS
    #define POLYCALL_API __declspec(dllexport)
  #else
    #define POLYCALL_API __declspec(dllimport)
  #endif
#else
  #define POLYCALL_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Direct FFI boundary for libpolycall-style calls.
 * This is intentionally NOT NSIGII logic and NOT a DOP adapter.
 * It exposes stable C ABI functions that Python/Node/etc can load.
 */
POLYCALL_API int polycall_verify_command(const char *command,
                                         char *out_buffer,
                                         int out_buffer_len);

POLYCALL_API int polycall_runtime_micro_attach(const char *dependency_path,
                                               char *out_buffer,
                                               int out_buffer_len);

POLYCALL_API int polycall_runtime_micro_detach(const char *dependency_path,
                                               char *out_buffer,
                                               int out_buffer_len);

#ifdef __cplusplus
}
#endif

#endif /* POLYCALL_FFI_H */
