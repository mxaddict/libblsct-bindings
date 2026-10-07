#!/bin/bash
# Copy the repository-wide navio-core pin into every binding package that
# builds libblsct itself. Each package needs its own copy because it is built
# from its own directory at install time, where ffi/navio-core.sha is absent.
#
# Bump the pin by editing ffi/navio-core.sha, then run this script.

set -euo pipefail

SHARED="./ffi/navio-core.sha"
PACKAGES=(
    "./ffi/python"
    "./ffi/ts"
)

for pkg in "${PACKAGES[@]}"; do
    cp "$SHARED" "$pkg/navio-core.sha"
    echo "Synced $pkg/navio-core.sha"
done
