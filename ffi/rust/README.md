# Rust binding

[![Crates.io](https://img.shields.io/crates/v/navio-blsct.svg)](https://crates.io/crates/navio-blsct)

## Building

`cargo build` builds navio-core's standalone libblsct at the commit pinned in
`navio-core.sha` (a copy of the repository-wide `ffi/navio-core.sha`, kept in
sync by `script/sync-navio-core-pin.sh`) and links it statically. It needs
CMake, git and a C++20 compiler (Visual Studio 2022 on Windows). The archives
are kept in `libs/` and rebuilt when the pin changes; `./clear_libs_dir.sh`
forces a rebuild.

- `BLSCT_PREBUILT_DIR` links archives already built for the same pin instead (CI
  builds them once per runner image); a directory built from another commit is
  refused.
- `BLSCT_LOCAL_NAVIO_CORE=1` builds the checkout in `target/navio-core` as-is,
  e.g. an unmerged navio-core branch.

## Running an example code

```bash
cargo run --example init-only
```
