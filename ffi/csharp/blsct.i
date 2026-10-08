%module blsct

// build_tx_out's memo crosses as SWIG's (const char *STRING, size_t LENGTH)
// pair (see ../blsct.i); C# gained those typemaps in SWIG 4.3.0. An older SWIG
// only warns and emits a different build_tx_out signature, so refuse it here.
#if SWIG_VERSION < 0x040300
#error "The C# binding needs SWIG 4.3.0 or later."
#endif

%{
#include "blsct/external_api/blsct.h"
%}

%include "../blsct.i"
