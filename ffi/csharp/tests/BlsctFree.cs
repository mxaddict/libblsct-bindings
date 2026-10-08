using System.Reflection;
using System.Runtime.InteropServices;

namespace NavioBlsct.Tests;

internal static class BlsctFree
{
    public static void FreeObj(object? obj)
    {
        if (obj is null)
        {
            return;
        }

        var swigPtrField = obj.GetType().GetField("swigCPtr", BindingFlags.Instance | BindingFlags.NonPublic);
        if (swigPtrField?.GetValue(obj) is HandleRef handleRef)
        {
            // Through SWIG's own export, which every platform's library has.
            // libblsct's raw free_obj is only exported where a link happens to
            // export every symbol; an MSVC DLL exports only what is marked.
            blsctPINVOKE.free_obj(handleRef);
            var swigCmField = obj.GetType().GetField("swigCMemOwn", BindingFlags.Instance | BindingFlags.NonPublic);
            swigCmField?.SetValue(obj, false);
            return;
        }

        throw new ArgumentException($"Unsupported SWIG object type: {obj.GetType().FullName}", nameof(obj));
    }
}
