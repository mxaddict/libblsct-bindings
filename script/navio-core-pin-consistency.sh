#!/bin/bash
# Fail when a binding's copy of the navio-core pin differs from the shared
# ffi/navio-core.sha, so every binding builds libblsct from the same commit.

set -euo pipefail

SHARED="./ffi/navio-core.sha"

if [[ ! -f "$SHARED" ]]; then
    echo "❌ Shared navio-core pin missing: $SHARED"
    exit 1
fi

shared_sha="$(tr -d '[:space:]' < "$SHARED")"
if [[ ! "$shared_sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "❌ $SHARED must hold one full 40-character commit SHA, got '$shared_sha'"
    exit 1
fi

copies=()
while IFS= read -r -d '' f; do
    copies+=("$f")
done < <(find ./ffi -mindepth 2 -name navio-core.sha -not -path '*/node_modules/*' -not -path '*/navio-core/*' -print0)

# A check that matched no copies would pass while checking nothing.
if [[ ${#copies[@]} -eq 0 ]]; then
    echo "❌ No binding copies of navio-core.sha found under ./ffi"
    exit 1
fi

status=0
for f in "${copies[@]}"; do
    sha="$(tr -d '[:space:]' < "$f")"
    if [[ "$sha" == "$shared_sha" ]]; then
        echo "✓ $f"
    else
        echo "❌ $f is '$sha', expected '$shared_sha' (run ./script/sync-navio-core-pin.sh)"
        status=1
    fi
done

if [[ $status -eq 0 ]]; then
    echo "✅ All ${#copies[@]} binding copies match $SHARED ($shared_sha)"
fi
exit $status
