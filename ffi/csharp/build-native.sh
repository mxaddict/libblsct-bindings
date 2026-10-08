#!/bin/bash
# Build the native library the C# binding P/Invokes (blsct.dll, libblsct.so or
# libblsct.dylib) and copy it to $OUT_DIR (default: ffi/csharp/native/out).
#
#   1. Clone navio-core at the shared pin (ffi/navio-core.sha) into
#      ffi/csharp/navio-core, unless BLSCT_LOCAL_NAVIO_CORE=1, which builds the
#      checkout already there as-is (e.g. an unmerged core branch).
#   2. Build its standalone libblsct (BUILD_LIBBLSCT_ONLY), as the TS and
#      Python bindings do.
#   3. Build ffi/csharp/native: the SWIG C# wrapper linked against it.
#
# Needs cmake, git, swig and a C++20 compiler (MSVC on Windows).

set -euo pipefail

CSHARP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$CSHARP_DIR/../.." && pwd)"
CORE_DIR="$CSHARP_DIR/navio-core"
NATIVE_BUILD_DIR="$CSHARP_DIR/native/build"
OUT_DIR="${OUT_DIR:-$CSHARP_DIR/native/out}"
SHA="$(tr -d '[:space:]' < "$REPO_DIR/ffi/navio-core.sha")"
JOBS="$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"

if [[ "${BLSCT_LOCAL_NAVIO_CORE:-}" == "1" ]]; then
    [[ -f "$CORE_DIR/src/blsct/external_api/blsct.h" ]] || {
        echo "BLSCT_LOCAL_NAVIO_CORE=1 but $CORE_DIR is not a navio-core checkout" >&2
        exit 1
    }
    echo "Using the navio-core checkout in $CORE_DIR as-is"
elif [[ -d "$CORE_DIR/.git" ]]; then
    # Never delete a checkout here: it may hold local work. Refuse instead.
    have="$(git -C "$CORE_DIR" rev-parse HEAD)"
    if [[ "$have" != "$SHA" ]]; then
        echo "$CORE_DIR is at $have, but the pin is $SHA." >&2
        echo "Remove it to re-clone, or set BLSCT_LOCAL_NAVIO_CORE=1 to build it as-is." >&2
        exit 1
    fi
    echo "navio-core already at $SHA"
else
    git clone --depth 1 https://github.com/nav-io/navio-core "$CORE_DIR"
    git -C "$CORE_DIR" fetch --depth 1 origin "$SHA"
    git -C "$CORE_DIR" checkout --quiet "$SHA"
fi

cmake -S "$CORE_DIR" -B "$CORE_DIR/build" \
    -DBUILD_LIBBLSCT_ONLY=ON \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTS=OFF \
    -DBUILD_BENCH=OFF \
    -DCMAKE_POSITION_INDEPENDENT_CODE=ON
cmake --build "$CORE_DIR/build" --config Release --target blsct blst univalue -j "$JOBS"

cmake -S "$CSHARP_DIR/native" -B "$NATIVE_BUILD_DIR" \
    -DNAVIO_CORE_DIR="$CORE_DIR" \
    -DCMAKE_BUILD_TYPE=Release
cmake --build "$NATIVE_BUILD_DIR" --config Release -j "$JOBS"

mkdir -p "$OUT_DIR"
found=0
for lib in blsct.dll libblsct.so libblsct.dylib; do
    while IFS= read -r -d '' f; do
        cp "$f" "$OUT_DIR/$lib"
        echo "Built $OUT_DIR/$lib"
        found=1
    done < <(find "$NATIVE_BUILD_DIR" -name "$lib" -not -path '*/CMakeFiles/*' -print0)
done
[[ $found -eq 1 ]] || { echo "No native library found under $NATIVE_BUILD_DIR" >&2; exit 1; }
