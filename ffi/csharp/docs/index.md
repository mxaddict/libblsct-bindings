# NavioBlsct

**NavioBlsct** is a .NET P/Invoke binding for the
[libblsct](https://github.com/nav-io/navio-core) C library.
It exposes BLSCT sub-address derivation and address encoding/decoding
to any .NET project targeting net8.0, net10.0, or netstandard2.1.

## Quick start

```xml
<PackageReference Include="NavioBlsct" Version="0.1.0" />
```

Then:

```csharp
using NavioBlsct;

IntPtr subAddrId = Blsct.GenSubAddrId(account: 0, address: 0);
IntPtr subAddr   = Blsct.DeriveSubAddress(viewKey, spendKey, subAddrId);
string address   = Blsct.EncodeAddress(subAddr, AddressEncoding.Bech32M);
Blsct.FreeObj(subAddr);
Blsct.FreeObj(subAddrId);
```

See the [API Reference](xref:NavioBlsct) or browse the [Articles](articles/installation.md).
