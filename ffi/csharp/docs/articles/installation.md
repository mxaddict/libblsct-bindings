# Installation

NavioBlsct is available on [NuGet](https://www.nuget.org/packages/NavioBlsct).

## Requirements

- .NET 8, .NET 10, or .NET Standard 2.1
- The native `libblsct` shared library on the library search path:
  - Linux: `libblsct.so`
  - macOS: `libblsct.dylib`
  - Windows: `blsct.dll`

Set the `LIBBLSCT_SO_PATH` environment variable to an explicit path if the
library is not on the default search path.

## Adding the package

```xml
<PackageReference Include="NavioBlsct" Version="0.1.0" />
```

Or via the .NET CLI:

```bash
dotnet add package NavioBlsct
```
