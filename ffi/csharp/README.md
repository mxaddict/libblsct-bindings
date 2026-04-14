# NavioBlsct — C# Bindings for libblsct

P/Invoke bindings for the [libblsct](https://github.com/nav-io/navio-core) C
library. Exposes BLSCT sub-address derivation and address encoding/decoding to
.NET.

## Requirements

- .NET 8, .NET 10, or .NET Standard 2.1
- Native `libblsct.so` / `libblsct.dylib` / `blsct.dll` on the library search
  path (or set `LIBBLSCT_SO_PATH`)

## Installation

```xml
<PackageReference Include="NavioBlsct" Version="0.1.0" />
```

## Implemented features

### Sub-address ID generation

```csharp
IntPtr subAddrId = Blsct.GenSubAddrId(account: 0, address: 0);
// ... use subAddrId ...
Blsct.FreeObj(subAddrId);
```

Wraps `gen_sub_addr_id(long account, ulong address)`. Returns an opaque handle.
Caller must free with `FreeObj`.

### Sub-address derivation

```csharp
byte[] viewKey  = new byte[32];  // 32-byte view key
byte[] spendKey = new byte[48];  // 48-byte spend key (G1 point)

IntPtr subAddrId = Blsct.GenSubAddrId(0, 0);
IntPtr subAddr   = Blsct.DeriveSubAddress(viewKey, spendKey, subAddrId);
Blsct.FreeObj(subAddrId);
// ... use subAddr ...
Blsct.FreeObj(subAddr);
```

Wraps `derive_sub_address(byte* viewKey, byte* spendKey, BlsctSubAddrId*)`.

Key size constraints are validated before the P/Invoke call:

- `viewKey` must be exactly 32 bytes
- `spendKey` must be exactly 48 bytes

### Address encoding

```csharp
string address = Blsct.EncodeAddress(subAddr, AddressEncoding.Bech32M);
// e.g. "tnv1..."
```

Wraps `encode_address(BlsctSubAddr*, AddressEncoding)`. The HRP is fixed by the
native library. Default encoding is `Bech32M`.

`AddressEncoding` values:

| Name      | Value | Description           |
| --------- | ----- | --------------------- |
| `Bech32`  | 0     | Legacy Bech32         |
| `Bech32M` | 1     | Bech32m (recommended) |

### Address decoding

```csharp
IntPtr subAddr = Blsct.DecodeAddress("tnv1...");
// ... use subAddr ...
Blsct.FreeObj(subAddr);
```

Wraps `decode_address(const char*)`. Throws `InvalidOperationException` if the
native call fails (e.g. invalid address string).

### Memory management

```csharp
Blsct.FreeObj(handle);
```

All opaque handles returned by the native library must be freed with `FreeObj`.
Passing `IntPtr.Zero` is safe (no-op).

## Return value layout

Native functions return a `RetVal` struct:

| Offset            | Size          | Field                     |
| ----------------- | ------------- | ------------------------- |
| 0                 | 1 byte        | result code (0 = success) |
| `IntPtr.Size`     | `IntPtr.Size` | value pointer             |
| `IntPtr.Size * 2` | `nuint`       | value size                |

`EnsureSuccess` reads the result code and throws on non-zero. `ReadValuePtr`
reads the value pointer.

## Running tests

Unit tests (no native library needed):

```bash
dotnet test ffi/csharp/tests
```

Integration tests require the native library:

```bash
LIBBLSCT_SO_PATH=/path/to/libblsct.so dotnet test ffi/csharp/tests
```

Integration tests skip automatically when `LIBBLSCT_SO_PATH` is unset.

## Namespace

All types live in `NavioBlsct`:

- `Blsct` — static class with all public methods
- `AddressEncoding` — enum (`Bech32 = 0`, `Bech32M = 1`)
