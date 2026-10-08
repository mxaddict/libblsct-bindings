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

// Strings cross as UTF-8 on every platform. SWIG's defaults marshal through
// .NET's LPStr, which is the ANSI code page on Windows, so non-ASCII text such
// as a memo came back garbled there. Returned strings are copied out of the
// native buffer, which stays owned by the native side as before.
%typemap(imtype,
         inattributes="[global::System.Runtime.InteropServices.MarshalAs(global::System.Runtime.InteropServices.UnmanagedType.LPUTF8Str)]",
         out="global::System.IntPtr") char *, char[ANY], char[] "string"
%typemap(out) char *, char[ANY], char[] %{ $result = (char *)$1; %}
%typemap(csout, excode=SWIGEXCODE) char *, char[ANY], char[] {
    string ret = global::System.Runtime.InteropServices.Marshal.PtrToStringUTF8($imcall);$excode
    return ret;
  }

%include "../blsct.i"
