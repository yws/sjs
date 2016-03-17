
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>

#include "duktape.h"
#include "vm.h"


static void sjs__duk_fatal_handler(duk_context *ctx, duk_errcode_t code, const char *msg) {
    fprintf(stderr, "FATAL %ld: %s\n", (long) code, (const char *) (msg ? msg : "null"));
    fflush(stderr);
    abort();
}


DUK_EXTERNAL sjs_vm_t* sjs_vm_create(void) {
    sjs_vm_t* vm;
    vm = calloc(1, sizeof(*vm));
    assert(vm != NULL);

    vm->ctx = duk_create_heap(NULL,                     /* alloc function */
			      NULL,                     /* realloc function */
			      NULL,                     /* free function */
			      (void*) vm,               /* user data */
			      sjs__duk_fatal_handler    /* fatal error handler */
			     );
    assert(vm->ctx != NULL);
    return vm;
}


DUK_EXTERNAL void sjs_vm_destroy(sjs_vm_t* vm) {
    if (vm != NULL) {
	duk_destroy_heap(vm->ctx);
	vm->ctx = NULL;
	free(vm);
    }
}

