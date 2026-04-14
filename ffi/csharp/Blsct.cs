using System;
using System.Runtime.InteropServices;

namespace NavioBlsct
{
    /// <summary>
    /// Internal compatibility facade kept for tests and transition code.
    /// Public consumers should use the SWIG-generated API directly.
    /// </summary>
    internal static unsafe class Blsct
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

        /// <summary>
        /// Generates a sub-address identifier for the given HD-wallet account and address index.
        /// </summary>
        /// <param name="account">The account index (HD derivation level).</param>
        /// <param name="address">The address index within the account.</param>
        /// <returns>
        /// An opaque native handle to the sub-address identifier.
        /// The caller is responsible for freeing this handle with <see cref="FreeObj"/>.
        /// </returns>
        /// <remarks>
        /// Wraps the native function <c>gen_sub_addr_id(long account, ulong address)</c>.
        /// The returned handle is required as an input to <see cref="DeriveSubAddress"/>.
        /// </remarks>
        public static IntPtr GenSubAddrId(long account, ulong address)
        {
            return gen_sub_addr_id(account, address);
        }

        /// <summary>
        /// Derives a BLSCT sub-address from a view key, spend key, and sub-address identifier.
        /// </summary>
        /// <param name="viewKey">
        /// The 32-byte view key. Must not be <see langword="null"/> and must be exactly 32 bytes.
        /// </param>
        /// <param name="spendKey">
        /// The 48-byte spend key (a G1 curve point in compressed form).
        /// Must not be <see langword="null"/> and must be exactly 48 bytes.
        /// </param>
        /// <param name="subAddrId">
        /// An opaque handle obtained from <see cref="GenSubAddrId"/>.
        /// </param>
        /// <returns>
        /// An opaque native handle to the derived sub-address.
        /// The caller is responsible for freeing this handle with <see cref="FreeObj"/>.
        /// </returns>
        /// <exception cref="ArgumentNullException">
        /// Thrown when <paramref name="viewKey"/> or <paramref name="spendKey"/> is <see langword="null"/>.
        /// </exception>
        /// <exception cref="ArgumentException">
        /// Thrown when <paramref name="viewKey"/> is not exactly 32 bytes,
        /// or <paramref name="spendKey"/> is not exactly 48 bytes.
        /// </exception>
        /// <remarks>
        /// Input sizes are validated in managed code before the P/Invoke call is made.
        /// The pinned byte arrays are passed to the native function as raw pointers.
        /// Wraps the native function <c>derive_sub_address(byte* viewKey, byte* spendKey, BlsctSubAddrId*)</c>.
        /// </remarks>
        public static IntPtr DeriveSubAddress(byte[] viewKey, byte[] spendKey, IntPtr subAddrId)
        {
            if (viewKey is null) throw new ArgumentNullException(nameof(viewKey));
            if (spendKey is null) throw new ArgumentNullException(nameof(spendKey));

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

        /// <summary>
        /// Encodes a native sub-address handle as a human-readable Bech32/Bech32m address string.
        /// </summary>
        /// <param name="subAddr">
        /// An opaque handle to a sub-address obtained from <see cref="DeriveSubAddress"/>.
        /// </param>
        /// <param name="encoding">
        /// The address encoding variant. Defaults to <see cref="AddressEncoding.Bech32M"/>.
        /// </param>
        /// <returns>
        /// A human-readable address string (e.g. <c>"tnv1..."</c>).
        /// The human-readable prefix (HRP) is fixed by the native library.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the native call returns a non-zero result code,
        /// or when the native library returns a null string pointer.
        /// </exception>
        /// <remarks>
        /// Wraps the native function <c>encode_address(BlsctSubAddr*, AddressEncoding)</c>.
        /// The native return-value struct and inner string pointer are both freed before this
        /// method returns; the caller receives a managed <see cref="string"/> copy.
        /// </remarks>
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

        /// <summary>
        /// Decodes a Bech32/Bech32m BLSCT address string into a native sub-address handle.
        /// </summary>
        /// <param name="blsctEncAddr">
        /// A non-null, non-empty, non-whitespace BLSCT address string (e.g. <c>"tnv1..."</c>).
        /// </param>
        /// <returns>
        /// An opaque native handle to the decoded sub-address.
        /// The caller is responsible for freeing this handle with <see cref="FreeObj"/>.
        /// </returns>
        /// <exception cref="ArgumentException">
        /// Thrown when <paramref name="blsctEncAddr"/> is <see langword="null"/>, empty, or whitespace.
        /// </exception>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the native library returns a non-zero result code (e.g. malformed address).
        /// </exception>
        /// <remarks>
        /// Wraps the native function <c>decode_address(const char*)</c>.
        /// The native return-value struct is freed internally; only the inner value pointer is returned.
        /// </remarks>
        public static IntPtr DecodeAddress(string blsctEncAddr)
        {
            if (string.IsNullOrWhiteSpace(blsctEncAddr)) throw new ArgumentException("Value cannot be null or whitespace.", nameof(blsctEncAddr));

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

        /// <summary>
        /// Releases a native handle allocated by the <c>libblsct</c> library.
        /// </summary>
        /// <param name="handle">
        /// The opaque handle to free. Passing <see cref="IntPtr.Zero"/> is safe and is a no-op.
        /// </param>
        /// <remarks>
        /// Wraps the native function <c>free_obj(void*)</c>.
        /// Always call this method when finished with any handle returned by
        /// <see cref="GenSubAddrId"/>, <see cref="DeriveSubAddress"/>, or <see cref="DecodeAddress"/>.
        /// </remarks>
        public static void FreeObj(IntPtr handle)
        {
            if (handle != IntPtr.Zero)
            {
                free_obj(handle);
            }
        }

        /// <summary>
        /// Reads the string value from a native return-value struct, frees the inner string pointer,
        /// and returns a managed copy of the string.
        /// </summary>
        /// <param name="retVal">Pointer to the native <c>RetVal</c> struct.</param>
        /// <returns>A managed string copy of the native ANSI string.</returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown when the result code is non-zero, or the value pointer is null.
        /// </exception>
        private static string ReadRetValStringAndFreeValue(IntPtr retVal)
        {
            EnsureSuccess(retVal);

            var valuePtr = ReadValuePtr(retVal);
            var value = Marshal.PtrToStringAnsi(valuePtr)
                ?? throw new InvalidOperationException("Native encode_address returned a null string.");
            FreeObj(valuePtr);
            return value;
        }

        /// <summary>
        /// Reads the result code from a native return-value struct and throws if it indicates failure.
        /// </summary>
        /// <param name="retVal">
        /// Pointer to the native <c>RetVal</c> struct. Must not be <see cref="IntPtr.Zero"/>.
        /// </param>
        /// <exception cref="InvalidOperationException">
        /// Thrown when <paramref name="retVal"/> is <see cref="IntPtr.Zero"/>,
        /// or when the result code at offset 0 is non-zero.
        /// </exception>
        /// <remarks>
        /// Reads the byte at offset 0 of the native struct via <see cref="ReadResultCode"/>.
        /// A value of 0 means success; any other value is treated as a native error.
        /// </remarks>
        internal static void EnsureSuccess(IntPtr retVal)
        {
            var result = ReadResultCode(retVal);
            if (result != 0)
            {
                throw new InvalidOperationException($"Native call failed with code {result}.");
            }
        }

        /// <summary>
        /// Reads the result code byte from a native return-value struct.
        /// </summary>
        /// <param name="retVal">
        /// Pointer to the native <c>RetVal</c> struct. Must not be <see cref="IntPtr.Zero"/>.
        /// </param>
        /// <returns>
        /// The byte at offset 0 of the struct. A value of <c>0</c> indicates success;
        /// any non-zero value indicates a native error.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        /// Thrown when <paramref name="retVal"/> is <see cref="IntPtr.Zero"/>.
        /// </exception>
        /// <remarks>
        /// Native <c>RetVal</c> layout:
        /// <list type="table">
        ///   <listheader><term>Offset</term><term>Size</term><term>Field</term></listheader>
        ///   <item><term>0</term><term>1 byte</term><term>Result code (this field)</term></item>
        ///   <item><term><c>IntPtr.Size</c></term><term><c>IntPtr.Size</c> bytes</term><term>Value pointer</term></item>
        ///   <item><term><c>IntPtr.Size * 2</c></term><term><c>nuint</c></term><term>Value size</term></item>
        /// </list>
        /// </remarks>
        internal static byte ReadResultCode(IntPtr retVal)
        {
            if (retVal == IntPtr.Zero)
            {
                throw new InvalidOperationException("Native call returned a null result pointer.");
            }

            return Marshal.ReadByte(retVal);
        }

        /// <summary>
        /// Reads the value pointer from a native return-value struct.
        /// </summary>
        /// <param name="retVal">
        /// Pointer to the native <c>RetVal</c> struct.
        /// </param>
        /// <returns>
        /// The <see cref="IntPtr"/> stored at offset <c>IntPtr.Size</c> within the struct.
        /// This is the pointer to the actual payload allocated by the native library.
        /// </returns>
        /// <remarks>
        /// Native <c>RetVal</c> layout:
        /// <list type="table">
        ///   <listheader><term>Offset</term><term>Size</term><term>Field</term></listheader>
        ///   <item><term>0</term><term>1 byte</term><term>Result code</term></item>
        ///   <item><term><c>IntPtr.Size</c></term><term><c>IntPtr.Size</c> bytes</term><term>Value pointer (this field)</term></item>
        ///   <item><term><c>IntPtr.Size * 2</c></term><term><c>nuint</c></term><term>Value size</term></item>
        /// </list>
        /// The caller is responsible for eventually freeing the returned pointer with <see cref="FreeObj"/>.
        /// </remarks>
        internal static IntPtr ReadValuePtr(IntPtr retVal)
        {
            return Marshal.ReadIntPtr(retVal, IntPtr.Size);
        }
    }
}
