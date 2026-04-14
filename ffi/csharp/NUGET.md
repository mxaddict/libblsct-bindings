# NuGet Native Runtime Packaging Plan

## Problem

The `NavioBlsct` NuGet package currently ships only managed C# code.
Consumers must build `libblsct.so`/`.dylib`/`blsct.dll` themselves and
ensure it's on the library search path. This is a major adoption barrier.

TypeScript and Python bindings don't have this issue — they statically embed
the `.a` archives into their native extensions at build time. C#/.NET can't
do that (no native linker in `dotnet build`), but the standard NuGet
`runtimes/` convention achieves the same consumer experience.

## Goal

Ship the native library inside the `.nupkg` so consumers just add a
`PackageReference` and everything works — no manual native lib management.

```
NavioBlsct.nupkg
├── lib/
│   ├── net8.0/NavioBlsct.dll
│   ├── net10.0/NavioBlsct.dll
│   └── netstandard2.1/NavioBlsct.dll
└── runtimes/
    ├── linux-x64/native/libblsct.so
    ├── osx-arm64/native/libblsct.dylib
    └── (future) win-x64/native/blsct.dll
```

## Current State

- **CI builds the shared lib** in `csharp-unit-tests.yml` for `ubuntu-24.04`
  (linux-x64) and `macos-15` (osx-arm64). The linking commands, include
  paths, and native stubs all work.
- **CI publishes a managed-only package** in `csharp-publish-pkg.yml` — runs
  on `ubuntu-latest`, does `dotnet pack` without any native libs, pushes to
  nuget.org. No artifact collection from other platforms.
- **No `runtimes/` directory** exists under `ffi/csharp/`.
- **No `.targets` file** exists for native lib copy-to-output.

## Implementation Plan

### Phase 1: .csproj Changes

**File**: `ffi/csharp/NavioBlsct.csproj`

1. Add `runtimes/` content to the package:

```xml
<ItemGroup>
  <None Include="runtimes/**/*" Pack="true" PackagePath="runtimes/" />
</ItemGroup>
```

2. Add a `.targets` file that auto-copies the native lib to the consumer's
   output directory (needed for `dotnet run` / `dotnet test` scenarios where
   `dotnet publish` isn't used):

```xml
<None Include="NavioBlsct.targets" Pack="true" PackagePath="build/" />
<None Include="NavioBlsct.targets" Pack="true" PackagePath="buildTransitive/" />
```

3. Add missing package metadata:

```xml
<Authors>nav-io</Authors>
<Description>C# bindings for libblsct (BLS Confidential Transactions)</Description>
<PackageLicenseExpression>MIT</PackageLicenseExpression>
<PackageProjectUrl>https://github.com/nav-io/navio-core</PackageProjectUrl>
<RepositoryUrl>https://github.com/mxaddict/btcpay-integration</RepositoryUrl>
<PackageTags>blsct;navio;crypto;bls;confidential-transactions</PackageTags>
<PackageReadmeFile>README.md</PackageReadmeFile>
```

And include the README in the pack:

```xml
<None Include="README.md" Pack="true" PackagePath="/" />
```

### Phase 2: Create NavioBlsct.targets

**New file**: `ffi/csharp/NavioBlsct.targets`

This MSBuild targets file ensures the native library is copied next to the
consumer's output assembly during build (not just publish). Required because
`DllImport` resolves from the assembly directory at runtime.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <Content
      Include="$(MSBuildThisFileDirectory)../runtimes/%(RuntimeIdentifier)/native/**"
      Condition="Exists('$(MSBuildThisFileDirectory)../runtimes/%(RuntimeIdentifier)/native/')"
      CopyToOutputDirectory="PreserveNewest"
      Link="%(Filename)%(Extension)" />
  </ItemGroup>
</Project>
```

> Note: The exact `.targets` content may need refinement. The .NET SDK
> already handles `runtimes/{rid}/native/` for `dotnet publish` and test
> hosts. A `.targets` file is only needed if `dotnet run`/`dotnet build`
> scenarios don't resolve correctly. Test before adding complexity.

### Phase 3: CI Workflow — Build Matrix with Artifact Upload

**File**: `.github/workflows/csharp-unit-tests.yml` (or new dedicated workflow)

Modify the existing build matrix to upload the native lib as a build artifact
after each platform leg:

```yaml
- name: Upload native library
  uses: actions/upload-artifact@v4
  with:
    name: libblsct-${{ matrix.os }}
    path: ${{ github.workspace }}/libblsct.*
```

This produces:
- `libblsct-ubuntu-24.04` → contains `libblsct.so` (linux-x64)
- `libblsct-macos-15` → contains `libblsct.dylib` (osx-arm64)

### Phase 4: CI Workflow — Pack Job

**File**: `.github/workflows/csharp-publish-pkg.yml`

Replace the single-runner workflow with a multi-stage pipeline:

#### Stage 1: Build native libs (matrix, reuse existing logic)

Runs on `ubuntu-24.04` and `macos-15`. Each leg:
1. Clones navio-core at pinned SHA
2. Builds depends + libblsct static archives
3. Links shared library (existing commands)
4. Uploads artifact

#### Stage 2: Pack + Publish (single runner, depends on Stage 1)

Runs on `ubuntu-latest` after all matrix legs complete:

1. Download all native lib artifacts
2. Place them in the `runtimes/` directory structure:
   ```
   ffi/csharp/runtimes/linux-x64/native/libblsct.so
   ffi/csharp/runtimes/osx-arm64/native/libblsct.dylib
   ```
3. Run `dotnet pack --configuration Release --output ./nupkg`
4. Run `dotnet nuget push` (on `workflow_dispatch` or tag trigger)

#### Approximate YAML structure:

```yaml
jobs:
  build-native:
    strategy:
      matrix:
        include:
          - os: ubuntu-24.04
            rid: linux-x64
            lib: libblsct.so
          - os: macos-15
            rid: osx-arm64
            lib: libblsct.dylib
    runs-on: ${{ matrix.os }}
    steps:
      # ... (existing navio-core clone, depends, build, link steps) ...
      - uses: actions/upload-artifact@v4
        with:
          name: native-${{ matrix.rid }}
          path: libblsct.*

  pack:
    needs: build-native
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Install SWIG
        run: sudo apt-get update && sudo apt-get install -y swig

      - name: Download native artifacts
        uses: actions/download-artifact@v4
        with:
          path: ffi/csharp/runtimes

      # Artifacts land as:
      #   ffi/csharp/runtimes/native-linux-x64/libblsct.so
      #   ffi/csharp/runtimes/native-osx-arm64/libblsct.dylib
      # Restructure to NuGet convention:
      - name: Arrange runtimes
        run: |
          cd ffi/csharp/runtimes
          for dir in native-*; do
            rid="${dir#native-}"
            mkdir -p "$rid/native"
            mv "$dir"/* "$rid/native/"
            rmdir "$dir"
          done

      - name: Pack
        run: dotnet pack NavioBlsct.csproj --configuration Release --output ./nupkg
        working-directory: ffi/csharp

      - name: Publish to NuGet
        if: github.event_name == 'workflow_dispatch'
        run: |
          dotnet nuget push ./nupkg/*.nupkg \
            --api-key ${{ secrets.NUGET_API_KEY }} \
            --source https://api.nuget.org/v3/index.json \
            --skip-duplicate
        working-directory: ffi/csharp
```

### Phase 5: Verification

1. Build `.nupkg` locally and inspect contents:
   ```bash
   dotnet pack --configuration Release --output ./nupkg
   unzip -l ./nupkg/NavioBlsct.0.1.0.nupkg | grep runtimes
   ```
   Confirm `runtimes/linux-x64/native/libblsct.so` etc. are present.

2. Create a test consumer project:
   ```bash
   dotnet new console -n TestConsumer
   cd TestConsumer
   dotnet add package NavioBlsct --source ../ffi/csharp/nupkg
   ```
   Verify `DllImport("blsct")` resolves without setting `LIBBLSCT_SO_PATH`.

3. Run integration tests without `LIBBLSCT_SO_PATH` — they should find the
   lib automatically from the NuGet package output.

4. Test on both `dotnet run` and `dotnet publish` paths.

## Platform Coverage

| RID | Runner | Status |
|---|---|---|
| `linux-x64` | `ubuntu-24.04` | Ready (CI exists) |
| `osx-arm64` | `macos-15` | Ready (CI exists) |
| `osx-x64` | `macos-13` | Not covered — add if needed |
| `win-x64` | `windows-latest` | Not covered — navio-core Windows build unknown |

### Adding osx-x64

Add `macos-13` to the matrix (last x64 macOS runner). Same build steps,
produces `runtimes/osx-x64/native/libblsct.dylib`.

### Adding Windows (future)

Requires:
- navio-core building on Windows, either native MSYS2/MinGW or cross-compiled
  from Linux
- Replacing `ffi/csharp/native_stubs.cpp` POSIX-only bits, especially
  `/dev/urandom`, with Windows-safe randomness APIs
- Producing `blsct.dll` and packaging it at
  `runtimes/win-x64/native/blsct.dll`
- Adding a `windows-latest` matrix leg and a pack job that includes the DLL

Likely Windows work items:
- Add `#ifdef _WIN32` support in `native_stubs.cpp` for randomness and any
  other missing C runtime assumptions
- Confirm SWIG-generated C# P/Invoke resolves `blsct.dll` without extra code
- Validate `dotnet test` and `dotnet publish` on Windows with the packaged
  native runtime

This is still the biggest unknown. Defer until there is consumer demand or a
clear need for Windows distribution.

## Task Breakdown

- [ ] Add `runtimes/` include + metadata to `NavioBlsct.csproj`
- [ ] Create `NavioBlsct.targets` (if needed after testing)
- [ ] Add artifact upload to `csharp-unit-tests.yml`
- [ ] Rewrite `csharp-publish-pkg.yml` as multi-stage pipeline
- [ ] Define Windows build path for `blsct.dll` and add `win-x64` packaging
- [ ] Test `.nupkg` contents locally
- [ ] Test consumer project resolves native lib automatically
- [ ] Add `runtimes/` to `.gitignore` under `ffi/csharp/`
- [ ] (Optional) Add `osx-x64` runner to matrix
- [ ] (Optional) Investigate Windows support

## Risks

1. **`.targets` complexity** — .NET SDK _should_ handle `runtimes/{rid}/native/`
   automatically for `dotnet publish` and test hosts. If `dotnet run` doesn't
   resolve, the `.targets` file adds complexity. Test first without it.

2. **Package size** — each native lib is ~5-15 MB. Multi-platform package
   could be 20-40 MB. Acceptable for crypto libraries; if not, consider
   separate per-RID packages (`NavioBlsct.runtime.linux-x64`, etc.).

3. **navio-core SHA pinning** — the native libs are built against a specific
   commit. Version bumps need coordinated SHA + NuGet version updates.

4. **CI build time** — building navio-core depends from scratch is slow.
   Existing caching (`actions/cache` on `depends/built`) mitigates this.
