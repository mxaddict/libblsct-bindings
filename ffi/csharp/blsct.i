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

// SWIG's own (STRING, LENGTH) helper passes the string as LPStr while telling
// the native side its UTF-8 byte count, so on Windows a non-ASCII string
// arrived as ANSI bytes. Hand SWIG_csharp_string_to_c the UTF-8 bytes instead,
// NUL-terminated because it copies size + 1 bytes.
%pragma(csharp) imclasscode=%{
  public class Utf8StringWithLength {
    [global::System.Runtime.InteropServices.DllImport("$dllimport", EntryPoint="SWIG_csharp_string_to_c")]
    private static extern global::System.IntPtr SWIG_csharp_string_to_c0(int size, int len, byte[] str);

    public static global::System.IntPtr ToC(string str) {
      if (str == null)
        return global::System.IntPtr.Zero;
      int size = global::System.Text.Encoding.UTF8.GetByteCount(str);
      byte[] bytes = new byte[size + 1];
      global::System.Text.Encoding.UTF8.GetBytes(str, 0, str.Length, bytes, 0);
      return SWIG_csharp_string_to_c0(size, str.Length, bytes);
    }
  }
%}
%typemap(csin) (const char *STRING, size_t LENGTH) "$modulePINVOKE.Utf8StringWithLength.ToC($csinput)"

%include "../blsct.i"
