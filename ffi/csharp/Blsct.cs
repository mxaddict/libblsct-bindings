using System;
using System.Runtime.InteropServices;

namespace NavioBlsct;

public enum AddressEncoding
{
    Bech32 = 0,
    Bech32M = 1,
}

public static unsafe class Blsct
{
    private const string LibraryName = "blsct";

    [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern IntPtr gen_sub_addr_id(long account, ulong address);

    [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern IntPtr derive_sub_address(byte* viewKey, byte* spendKey, IntPtr subAddrId);

    [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern IntPtr encode_address(IntPtr subAddr, AddressEncoding encoding);

    [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern IntPtr decode_address([MarshalAs(UnmanagedType.LPUTF8Str)] string blsctEncAddr);

    [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl, ExactSpelling = true)]
    private static extern void free_obj(IntPtr rv);

    public static IntPtr GenSubAddrId(long account, ulong address)
    {
        return gen_sub_addr_id(account, address);
    }

    public static IntPtr DeriveSubAddress(byte[] viewKey, byte[] spendKey, IntPtr subAddrId)
    {
        ArgumentNullException.ThrowIfNull(viewKey);
        ArgumentNullException.ThrowIfNull(spendKey);

        if (viewKey.Length != 32)
        {
            throw new ArgumentException("View key must be 32 bytes.", nameof(viewKey));
        }

        if (spendKey.Length != 48)
        {
            throw new ArgumentException("Spend key must be 48 bytes.", nameof(spendKey));
        }

        fixed (byte* viewKeyPtr = viewKey)
        fixed (byte* spendKeyPtr = spendKey)
        {
            return derive_sub_address(viewKeyPtr, spendKeyPtr, subAddrId);
        }
    }

    public static string EncodeAddress(IntPtr subAddr, AddressEncoding encoding = AddressEncoding.Bech32M)
    {
        var retVal = encode_address(subAddr, encoding);
        try
        {
            return ReadRetValStringAndFreeValue(retVal);
        }
        finally
        {
            FreeObj(retVal);
        }
    }

    public static IntPtr DecodeAddress(string blsctEncAddr)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(blsctEncAddr);

        var retVal = decode_address(blsctEncAddr);
        try
        {
            EnsureSuccess(retVal);
            return ReadValuePtr(retVal);
        }
        finally
        {
            FreeObj(retVal);
        }
    }

    public static void FreeObj(IntPtr handle)
    {
        if (handle != IntPtr.Zero)
        {
            free_obj(handle);
        }
    }

    private static string ReadRetValStringAndFreeValue(IntPtr retVal)
    {
        EnsureSuccess(retVal);

        var valuePtr = ReadValuePtr(retVal);
        var value = Marshal.PtrToStringAnsi(valuePtr)
            ?? throw new InvalidOperationException("Native encode_address returned a null string.");
        FreeObj(valuePtr);
        return value;
    }

    internal static void EnsureSuccess(IntPtr retVal)
    {
        var result = ReadResultCode(retVal);
        if (result != 0)
        {
            throw new InvalidOperationException($"Native call failed with code {result}.");
        }
    }

    internal static byte ReadResultCode(IntPtr retVal)
    {
        if (retVal == IntPtr.Zero)
        {
            throw new InvalidOperationException("Native call returned a null result pointer.");
        }

        return Marshal.ReadByte(retVal);
    }

    internal static IntPtr ReadValuePtr(IntPtr retVal)
    {
        return Marshal.ReadIntPtr(retVal, IntPtr.Size);
    }

}
