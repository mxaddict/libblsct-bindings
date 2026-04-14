# NavioBlsct — C# Bindings for libblsct

SWIG-generated bindings for the [libblsct](https://github.com/nav-io/navio-core)
C library. The public ABI comes from `blsct.i`; internal compatibility helpers
stay out of the consumer surface.

## Requirements

- .NET 8, .NET 10, or .NET Standard 2.1
- No manual native library setup needed — the NuGet package ships
  `libblsct.so` (linux-x64) and `libblsct.dylib` (osx-arm64) in the
  `runtimes/` directory. The .NET SDK resolves the correct native lib
  automatically.

## Installation

```xml
<PackageReference Include="NavioBlsct" Version="0.1.0" />
```

## Public API

Use the SWIG-generated `NavioBlsct.blsct` module classes and proxy types from
the package output. The legacy `Blsct` helper remains internal only.

## Implemented features

The generated surface covers the full ABI from `blsct.i`, including enums,
opaque pointer types, and the exported functions. See the generated API docs for
the current method list and call patterns.

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

- `blsct` — SWIG-generated module class
- `AddressEncoding` — enum (`Bech32 = 0`, `Bech32M = 1`)
- `Blsct*` and `SWIGTYPE_*` wrappers — generated proxy types
- `Blsct` — internal compatibility helper only

## Shared FFI contract

`ffi/csharp/blsct.i` mirrors the SWIG contract used by the TypeScript and
Python bindings. Keep the exported signatures in sync across all three files.
