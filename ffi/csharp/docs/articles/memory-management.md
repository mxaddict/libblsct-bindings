# Memory Management

NavioBlsct is a thin P/Invoke layer over `libblsct`. The native library
allocates memory for every opaque handle it returns. That memory is
**not** managed by the .NET garbage collector.

## Rule: always call FreeObj

Every `IntPtr` returned by the following methods **must** be freed when
no longer needed:

| Method | Frees |
|---|---|
| `Blsct.GenSubAddrId` | The sub-address identifier handle |
| `Blsct.DeriveSubAddress` | The sub-address handle |
| `Blsct.DecodeAddress` | The decoded sub-address handle |

```csharp
IntPtr subAddrId = Blsct.GenSubAddrId(0, 0);
try
{
    IntPtr subAddr = Blsct.DeriveSubAddress(viewKey, spendKey, subAddrId);
    try
    {
        string address = Blsct.EncodeAddress(subAddr);
        // use address ...
    }
    finally
    {
        Blsct.FreeObj(subAddr);
    }
}
finally
{
    Blsct.FreeObj(subAddrId);
}
```

## Safe no-op

Passing `IntPtr.Zero` to `FreeObj` is always safe and is a no-op.

## EncodeAddress is self-managing

`Blsct.EncodeAddress` returns a managed `string`. It internally frees
both the native return-value struct and the inner string pointer before
returning; the caller does **not** call `FreeObj` on the return value.
