# NavioBlsct — C# Bindings for libblsct

SWIG-generated bindings for the [libblsct](https://github.com/nav-io/navio-core)
C library. The public ABI comes from `blsct.i`.

## Requirements

- .NET 8, .NET 10, or .NET Standard 2.1
- The NuGet package ships native `runtimes/` assets for `linux-x64`,
  `osx-arm64`, and `win-x64`.
- `LIBBLSCT_SO_PATH` is only needed when running integration tests against an
  explicit shared library path.

## Installation

```xml
<PackageReference Include="NavioBlsct" Version="0.1.0" />
```

## Quick start

```csharp
using NavioBlsct;

blsct.init();
blsct.set_blsct_chain(BlsctChain.Mainnet);

// Key derivation
var rvSeed = blsct.gen_scalar(12345);
var seed = blsct.cast_to_scalar(rvSeed.value);
var childKey = blsct.from_seed_to_child_key(seed);
var txKey = blsct.from_child_key_to_tx_key(childKey);
var viewKey = blsct.from_tx_key_to_view_key(txKey);
var spendPk = blsct.scalar_to_pub_key(blsct.from_tx_key_to_spending_key(txKey));

// Sub-address derivation
var subAddrId = blsct.gen_sub_addr_id(0, 0);
var subAddr = blsct.derive_sub_address(viewKey, spendPk, subAddrId);
var dpkVal = blsct.sub_addr_to_dpk(subAddr);

// Address encode/decode
var rvEnc = blsct.encode_address(dpkVal, AddressEncoding.Bech32M);
var address = blsct.cast_to_const_char_ptr(rvEnc.value);

// Free native memory
blsct.free_obj(rvSeed.value);
blsct.free_obj(rvEnc.value);
```

## Public API

All public types live in `NavioBlsct`:

- `blsct` — SWIG-generated static module class (all FFI calls)
- `BlsctRetVal` — return type with `.result` (0 = success) and `.value`
- `BlsctBoolRetVal` — return type with `.result` and `.value` (bool)
- `BlsctAmountsRetVal` — return type for amount recovery
- `BlsctCTxRetVal` — return type for signed transaction build
- `AddressEncoding` — enum (`Bech32 = 0`, `Bech32M = 1`)
- `BlsctChain` — enum (`Mainnet`, `Testnet`, `Signet`, `Regtest`)
- `BlsctTokenType`, `TxOutputType`, `BlsctPredicateType` — enums
- `SWIGTYPE_p_*` — opaque typed handle wrappers

## Return value pattern

Every fallible native function returns a `BlsctRetVal`:

```csharp
var rv = blsct.gen_scalar(42);
if (rv.result != 0) throw new Exception("native call failed");
var scalar = blsct.cast_to_scalar(rv.value);
// ...
blsct.free_obj(rv.value);
```

`rv.value_size` carries the byte size for types that need it (range proofs,
vector predicates).

## Memory management

Every opaque handle returned by native code must be released with the matching
helper. Use `blsct.free_obj(val)` for heap-allocated opaque objects. Some
aggregate types have dedicated delete helpers:

```csharp
blsct.delete_uint64_vec(vec);
blsct.delete_range_proof_vec(rpVec);
blsct.delete_amount_recovery_req_vec(reqVec);
blsct.delete_string_map(map);
blsct.delete_token_info(tokenInfo);
blsct.delete_unsigned_input(unsignedInput);
blsct.delete_unsigned_output(unsignedOutput);
blsct.delete_unsigned_transaction(unsTx);
blsct.delete_ctx(ctxVal);
blsct.free_amounts_ret_val(amountsRv);
```

`delete_unsigned_input` and `delete_unsigned_output` are for standalone objects.
Once attached to an unsigned transaction, let `delete_unsigned_transaction`
clean them up.

## Building the native library

```bash
./ffi/csharp/build-native.sh
```

It builds libblsct from the navio-core commit pinned in `ffi/navio-core.sha`,
links the SWIG wrapper against it and leaves `blsct.dll`, `libblsct.so` or
`libblsct.dylib` in `ffi/csharp/native/out`. It needs CMake, git, SWIG 4.3.0 or
later and a C++20 compiler (Visual Studio 2022 on Windows). Set
`BLSCT_LOCAL_NAVIO_CORE=1` to build an existing checkout in
`ffi/csharp/navio-core` as-is instead of the pinned commit.

## Running tests

Integration tests require the native library:

```bash
LIBBLSCT_SO_PATH=/path/to/libblsct.so dotnet test ffi/csharp/tests
```

Tests skip automatically when `LIBBLSCT_SO_PATH` is unset.

## Shared FFI contract

`ffi/csharp/blsct.i` includes `ffi/ts/swig/blsct.i` and mirrors the SWIG
contract used by the TypeScript and Python bindings. Keep exported signatures in
sync across all three language `.i` files.
