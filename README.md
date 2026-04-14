# libblsct-bindings

[![Python: Run unit tests](https://github.com/nav-io/libblsct-bindings/actions/workflows/python-unit-tests.yml/badge.svg)](https://github.com/nav-io/libblsct-bindings/actions/workflows/python-unit-tests.yml)
[![TypeScript: Run unit tests](https://github.com/nav-io/libblsct-bindings/actions/workflows/ts-unit-tests.yml/badge.svg)](https://github.com/nav-io/libblsct-bindings/actions/workflows/ts-unit-tests.yml)
[![TypeScript Browser: Run WASM unit tests](https://github.com/nav-io/libblsct-bindings/actions/workflows/ts-browser-unit-tests.yml/badge.svg)](https://github.com/nav-io/libblsct-bindings/actions/workflows/ts-browser-unit-tests.yml)
[![C#: Run unit tests](https://github.com/nav-io/libblsct-bindings/actions/workflows/csharp-unit-tests.yml/badge.svg)](https://github.com/nav-io/libblsct-bindings/actions/workflows/csharp-unit-tests.yml)
[![PyPI](https://img.shields.io/pypi/v/navio-blsct)](https://pypi.org/project/navio-blsct/)
[![npm](https://img.shields.io/npm/v/navio-blsct)](https://www.npmjs.com/package/navio-blsct)
[![NuGet](https://img.shields.io/nuget/v/NavioBlsct)](https://www.nuget.org/packages/NavioBlsct)
[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

`libblsct-bindings` provides multi-language bindings for [navio-core](https://github.com/nav-io/navio-core)'s BLS Confidential Transactions (BLSCT) library.

BLSCT enables **confidential transactions** on the Navio blockchain — amounts and recipient addresses are hidden on-chain using BLS12-381 elliptic curve cryptography and range proofs. These bindings expose the key derivation, sub-address generation, address encoding, and transaction construction primitives needed to build wallets and integrations in your language of choice.

## Requirements

All language bindings require the native `libblsct` shared library to be available on your system:

- Linux: `libblsct.so`
- macOS: `libblsct.dylib`
- Windows: `blsct.dll`

See [navio-core](https://github.com/nav-io/navio-core) for build instructions.

## Supported languages

- [Python](https://github.com/nav-io/libblsct-bindings/blob/main/ffi/python/README.md)
  - [Package (PyPI)](https://pypi.org/project/navio-blsct/)
  - [Documentation](https://nav-io.github.io/libblsct-bindings/python/)
  - ```bash
    pip install navio-blsct
    ```
- [TypeScript/JavaScript](https://github.com/nav-io/libblsct-bindings/blob/main/ffi/ts/README.md)
  - [Package (npm)](https://www.npmjs.com/package/navio-blsct)
  - [Documentation](https://nav-io.github.io/libblsct-bindings/ts/)
  - ```bash
    npm install navio-blsct
    ```
- [C#](https://github.com/nav-io/libblsct-bindings/blob/main/ffi/csharp/README.md)
  - [Package (NuGet)](https://www.nuget.org/packages/NavioBlsct)
  - Targets: `net8.0`, `net10.0`, `netstandard2.1`
  - [Documentation](https://nav-io.github.io/libblsct-bindings/csharp/)
  - ```bash
    dotnet add package NavioBlsct
    ```

## Languages to be supported

- [C](https://github.com/nav-io/libblsct-bindings/blob/main/ffi/c/README.md)
- [Rust](https://github.com/nav-io/libblsct-bindings/blob/main/ffi/rust/README.md)
- [Go](https://github.com/nav-io/libblsct-bindings/blob/main/ffi/go/README.md)

## Contributing

Contributions are welcome. Each language binding lives under `ffi/<lang>/` and has its own README with build and test instructions. Before submitting a PR:

- Run the test suite for the language you changed
- Ensure the SWIG interface files (`blsct.i`) stay in sync across Python and TypeScript (checked by CI)
- Follow the existing code style for that language

## License

[MIT](LICENSE) — Copyright 2025 The Navio Developers
