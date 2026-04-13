using System;
using System.Runtime.InteropServices;
using NavioBlsct;
using Xunit;

namespace NavioBlsct.Tests;

public sealed class BlsctTests
{
    [Fact]
    public void AddressEncodingValuesMatchNativeEnum()
    {
        Assert.Equal(0, (int)AddressEncoding.Bech32);
        Assert.Equal(1, (int)AddressEncoding.Bech32M);
    }

    [Fact]
    public void DeriveSubAddressRejectsNullViewKey()
    {
        Assert.Throws<ArgumentNullException>(() => Blsct.DeriveSubAddress(null!, new byte[48], IntPtr.Zero));
    }

    [Fact]
    public void DeriveSubAddressRejectsShortKeys()
    {
        Assert.Throws<ArgumentException>(() => Blsct.DeriveSubAddress(new byte[31], new byte[48], IntPtr.Zero));
        Assert.Throws<ArgumentException>(() => Blsct.DeriveSubAddress(new byte[32], new byte[47], IntPtr.Zero));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void DecodeAddressRejectsEmptyInput(string? input)
    {
        if (input is null)
        {
            Assert.Throws<ArgumentNullException>(() => Blsct.DecodeAddress(input!));
        }
        else
        {
            Assert.Throws<ArgumentException>(() => Blsct.DecodeAddress(input));
        }
    }

    [Fact]
    public void FreeObjIgnoresNullHandle()
    {
        Blsct.FreeObj(IntPtr.Zero);
    }

    [Fact]
    public void ReadResultCodeReadsFirstByteFromRetVal()
    {
        var retVal = AllocateRetVal(result: 0x05, valuePtr: IntPtr.Zero, valueSize: 0);
        try
        {
            Assert.Equal((byte)0x05, Blsct.ReadResultCode(retVal));
        }
        finally
        {
            Marshal.FreeHGlobal(retVal);
        }
    }

    [Fact]
    public void ReadValuePtrReadsNativePointerLayout()
    {
        var payload = Marshal.StringToHGlobalAnsi("tnv1example");
        var retVal = AllocateRetVal(result: 0, valuePtr: payload, valueSize: 11);
        try
        {
            Assert.Equal(payload, Blsct.ReadValuePtr(retVal));
        }
        finally
        {
            Marshal.FreeHGlobal(payload);
            Marshal.FreeHGlobal(retVal);
        }
    }

    [Fact]
    public void EnsureSuccessThrowsOnFailureCode()
    {
        var retVal = AllocateRetVal(result: 2, valuePtr: IntPtr.Zero, valueSize: 0);
        try
        {
            Assert.Throws<InvalidOperationException>(() => Blsct.EnsureSuccess(retVal));
        }
        finally
        {
            Marshal.FreeHGlobal(retVal);
        }
    }

    private static IntPtr AllocateRetVal(byte result, IntPtr valuePtr, nuint valueSize)
    {
        var size = IntPtr.Size == 8 ? 24 : 12;
        var retVal = Marshal.AllocHGlobal(size);
        Span<byte> zero = stackalloc byte[size];
        Marshal.Copy(zero.ToArray(), 0, retVal, size);

        Marshal.WriteByte(retVal, result);
        Marshal.WriteIntPtr(retVal, IntPtr.Size, valuePtr);

        if (IntPtr.Size == 8)
        {
            Marshal.WriteInt64(retVal, IntPtr.Size * 2, checked((long)valueSize));
        }
        else
        {
            Marshal.WriteInt32(retVal, IntPtr.Size * 2, checked((int)valueSize));
        }

        return retVal;
    }
}
