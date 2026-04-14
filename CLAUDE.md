# Claude Code Instructions for libblsct-bindings

## Project Overview

This project provides TypeScript, Python, and other language bindings for the
libblsct (BLS Confidential Transactions) C++ library. It uses SWIG to generate
FFI (Foreign Function Interface) bindings for multiple languages.

## Critical Rules

### 🚫 NEVER Modify navio-core Dependencies

**CRITICAL**: The `navio-core` directory and its contents should **NEVER** be
modified by you. This directory contains the upstream C++ library that is
managed as a git submodule and is regularly updated by the project maintainers.

- DO NOT edit any files in `navio-core/`
- DO NOT suggest changes to files in `navio-core/`
- If you see issues with the C++ code, report them but DO NOT modify the files
- The `navio-core` commit hash is pinned in build scripts - this is intentional

## Project Structure

```
libblsct-bindings/
├── ffi/
│   ├── ts/                    # TypeScript bindings
│   │   ├── src/               # TypeScript source files
│   │   ├── swig/              # SWIG interface and generated wrappers
│   │   │   ├── blsct.i        # SWIG interface definition (source of truth)
│   │   │   └── blsct_wrap.cxx # Auto-generated (DO NOT EDIT MANUALLY)
│   │   ├── wasm/              # WebAssembly build output
│   │   ├── scripts/           # Build scripts
│   │   └── __tests__/         # Test files
│   ├── python/                # Python bindings
│   │   └── blsct/
│   │       ├── blsct.i        # Python SWIG interface (must match TS version)
│   │       └── *.py           # Python wrapper classes
│   └── csharp/                # C# P/Invoke bindings
│       ├── Blsct.cs           # All public API (static Blsct class + AddressEncoding enum)
│       ├── AssemblyInfo.cs    # Assembly metadata
│       ├── NavioBlsct.csproj  # Package: NavioBlsct, targets net8.0/net10.0/netstandard2.1
│       ├── README.md          # C# usage docs
│       └── tests/
│           ├── BlsctTests.cs            # Unit tests (no native lib needed)
│           ├── BlsctIntegrationTests.cs # Integration tests (require LIBBLSCT_SO_PATH)
│           └── NavioBlsct.Tests.csproj
└── navio-core/                # ⚠️ NEVER MODIFY - upstream C++ library
```

## SWIG Interface Consistency

### Critical Requirement

The SWIG interface files MUST be kept in sync across all languages:

- `ffi/ts/swig/blsct.i` (TypeScript)
- `ffi/python/blsct/blsct.i` (Python)

A CI workflow (`Common: Check blsct.i consistency`) enforces this. If function
signatures are updated in one language's `.i` file, they MUST be updated in all
other language `.i` files.

### When Adding/Modifying FFI Functions

1. Update the C++ header in `navio-core` (done by maintainers, not you)
2. Update TypeScript SWIG interface: `ffi/ts/swig/blsct.i`
3. Update Python SWIG interface: `ffi/python/blsct/blsct.i`
4. Regenerate SWIG wrappers (done by CI/build scripts)
5. Update TypeScript wrapper classes in `ffi/ts/src/`
6. Update Python wrapper classes in `ffi/python/blsct/`
7. Add tests for both Node.js and browser environments

## Testing

### Dual Test Environments

The TypeScript bindings must work in both:

1. **Node.js** (native bindings via SWIG)
2. **Browser** (WebAssembly via Emscripten)

### Test Requirements

- ALL tests must pass in BOTH environments
- Test count must match between Node.js and browser
- Use `npm test` for Node.js tests
- Use `npm run test:browser` for browser/WASM tests

### Test Configuration

- `jest.config.cjs` - Node.js test configuration
- `jest.browser.config.cjs` - Browser/WASM test configuration

Both configurations should run the same test files unless a test has
environment-specific issues (should be rare and documented).

## Build System

### Node.js Native Bindings

- Uses `node-gyp` to build native Node.js addons
- SWIG generates `blsct_wrap.cxx` from `blsct.i`
- Generated files are NOT committed to git (regenerated during build)

### WebAssembly (WASM)

- Uses Emscripten to compile C++ to WebAssembly
- Built with `npm run build:wasm`
- Output goes to `wasm/` directory
- Supports both Node.js and browser environments

### Important Build Notes

1. **SWIG Wrappers**: The `blsct_wrap.cxx` file is auto-generated. If you see
   it's out of sync with the `.i` file, regenerate it with:

   ```bash
   cd ffi/ts/swig
   swig -javascript -node -c++ -o blsct_wrap.cxx blsct.i
   ```

2. **WASM Build**: Always rebuild WASM after C++ changes:

   ```bash
   npm run build:wasm
   ```

3. **Never commit** generated files like `blsct_wrap.cxx` or WASM binaries

## Common Issues and Solutions

### 1. "Illegal number of arguments" Error

**Symptom**: Test fails with "Illegal number of arguments for \_wrap_XXX"

**Cause**: SWIG wrapper is out of sync with interface definition

**Solution**:

- Regenerate SWIG wrapper:
  `swig -javascript -node -c++ -o blsct_wrap.cxx blsct.i`
- Rebuild native bindings: `node-gyp configure build`

### 2. CI Consistency Check Fails

**Symptom**: "Inconsistency detected between ./ffi/ts/swig/blsct.i and
./ffi/python/blsct/blsct.i"

**Cause**: Function signatures differ between language bindings

**Solution**:

- Compare the two `.i` files
- Update both to match the C++ header
- Update corresponding wrapper classes in both languages

### 3. Browser Tests Have Different Count Than Node.js

**Symptom**: Different number of test suites between environments

**Cause**: `jest.browser.config.cjs` excludes some test files

**Solution**:

- Check `testPathIgnorePatterns` in browser config
- Only exclude tests that genuinely cannot run in WASM
- Document why specific tests are excluded

### 4. BigInt Serialization Issues

**Symptom**: JSON.stringify fails with "Do not know how to serialize a BigInt"

**Cause**: Native JSON doesn't support BigInt

**Solution**:

```typescript
// Serialize
JSON.stringify(obj, (_, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

// Deserialize
const amount =
  typeof obj.amount === 'string' ? BigInt(obj.amount) : BigInt(obj.amount);
```

## Git Workflow

### Before Pushing

1. Run both test suites locally:

   ```bash
   npm test
   npm run test:browser
   ```

2. Ensure both show same test counts

3. Commit with descriptive messages including "Co-Authored-By: Claude Sonnet 4.5
   <noreply@anthropic.com>"

4. Push and monitor CI workflows:

   ```bash
   git push
   gh run list --branch <branch-name>
   ```

5. Fix any CI failures before considering work complete

### CI Workflows

Key workflows to watch:

- `TypeScript: Run unit tests` - Node.js tests
- `TypeScript Browser: Run WASM unit tests` - Browser tests
- `Common: Check blsct.i consistency` - Interface consistency
- `Python: Run unit tests` - Python tests

## Code Style

### TypeScript

- Use explicit types
- Prefer `const` over `let`
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Follow existing patterns in the codebase

### Tests

- One test file per source file
- Use descriptive test names
- Test both success and error cases
- Include edge cases (empty strings, special characters, unicode)
- Test serialization roundtrips

## Memory Management

### SWIG Objects

- SWIG creates proxy objects that wrap C++ pointers
- Always call appropriate cleanup functions
- Be aware of ownership transfer between JS and C++

### WASM Considerations

- Memory is more constrained in WASM
- Large operations (like range proofs) can be slow
- Use longer test timeouts for WASM tests (60s default)

## Key Learning from Recent Work

### AmountRecoveryReq Parameter Addition

When the `token_id` parameter was added to `gen_amount_recovery_req`:

1. **Root Cause**: Function signature changed from 3 to 4 parameters
2. **Impact**: Both TypeScript and Python bindings needed updates
3. **Fix Process**:
   - Updated both `.i` files
   - Updated wrapper classes to accept and pass `token_id`
   - Added default values for backward compatibility
   - Updated all call sites
   - Ensured tests covered the new parameter

This demonstrated the importance of:

- Keeping all language bindings in sync
- Adding comprehensive tests
- Using default values for backward compatibility
- Monitoring CI for cross-language consistency

## C# Bindings (ffi/csharp)

### Architecture

SWIG-generated public API. Internal compatibility helpers may still exist, but
consumers should only see the generated surface.

- `blsct.i` — shared FFI contract; keep it aligned with TS/Python SWIG files
- `Blsct.cs` — internal compatibility helper only
- SWIG output is generated at build time into `obj/swig/`
- Public consumers use `blsct` and generated proxy types

### Implemented API surface

The C# `blsct.i` includes the TS contract via `%include "../ts/swig/blsct.i"`,
so the **full** API surface is generated by SWIG at build time. All functions
declared in the shared `.i` file are available through the `blsct` static class
in the `NavioBlsct` namespace. Key API groups:

| Group                        | Example methods                                                    |
| ---------------------------- | ------------------------------------------------------------------ |
| Init / chain                 | `init`, `get_blsct_chain`, `set_blsct_chain`                      |
| Address                      | `encode_address`, `decode_address`                                 |
| Sub-address                  | `gen_sub_addr_id`, `derive_sub_address`, `sub_addr_to_dpk`        |
| Double public key            | `gen_double_pub_key`, `gen_dpk_with_keys_acct_addr`, `dpk_to_sub_addr` |
| Scalar                       | `gen_random_scalar`, `gen_scalar`, `scalar_to_uint64`, `scalar_to_str` |
| Point                        | `gen_base_point`, `gen_random_point`, `is_valid_point`             |
| Public key                   | `gen_random_public_key`, `point_to_public_key`                     |
| Key ID                       | `calc_key_id`, `serialize_key_id`, `deserialize_key_id`            |
| Key derivation               | `from_seed_to_child_key`, `from_tx_key_to_view_key`, etc.         |
| Signature                    | `sign_message`, `verify_msg_sig`                                   |
| Range proof                  | `build_range_proof`, `verify_range_proofs`                         |
| Amount recovery              | `gen_amount_recovery_req`, `recover_amount`                        |
| Token ID                     | `gen_token_id`, `gen_default_token_id`                             |
| Token info                   | `build_token_info`, `get_token_info_type`                          |
| Collection tokens            | `calc_collection_token_hash`, `derive_collection_token_key`        |
| Tx in / out                  | `build_tx_in`, `build_tx_out`, getters for each field              |
| Unsigned tx                  | `build_unsigned_input`, `build_unsigned_output`, `sign_unsigned_transaction` |
| Signed tx (CTx)              | `build_ctx`, `serialize_ctx`, `deserialize_ctx`                    |
| Tx aggregation               | `aggregate_transactions`                                           |
| Vector predicates            | `build_create_token_predicate`, `build_mint_token_predicate`, etc. |
| Serialization                | `serialize_*` / `deserialize_*` for every type                     |
| Memory                       | `free_obj`, `free_amounts_ret_val`                                 |
| Helpers                      | `hex_to_malloced_buf`, `buf_to_malloced_hex_c_str`, cast helpers   |

Internal `Blsct.cs` helpers stay internal. Use them only for compatibility or tests.

### RetVal layout

Native functions return a pointer to:

```
[0]               byte     result code  (0 = success)
[IntPtr.Size]     IntPtr   value pointer
[IntPtr.Size * 2] nuint    value size
```

### Testing

- Unit tests (`BlsctTests.cs`) — pure .NET, no native lib, cover input
  validation and RetVal parsing on the internal helper path
- Integration tests (`BlsctIntegrationTests.cs`) — skip automatically when
  `LIBBLSCT_SO_PATH` env var is unset; cover full roundtrip
  `GenSubAddrId → DeriveSubAddress → EncodeAddress → DecodeAddress`

### Adding new API

1. Add `[DllImport]` private extern declaration in `Blsct.cs`
2. Keep the helper internal
3. Update the SWIG contract first, then regenerate
4. Add/update unit and integration tests for the new generated surface

## Resources

- [SWIG Documentation](http://www.swig.org/Doc4.0/SWIGDocumentation.html)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [node-gyp Documentation](https://github.com/nodejs/node-gyp)
