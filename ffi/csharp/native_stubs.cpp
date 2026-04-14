// Stubs for symbols that libblsct.a references but are normally provided
// by the full navio-core binary. Only needed when linking into a standalone
// shared library for C# P/Invoke.

#include <cstdint>
#include <cstdio>
#include <functional>
#include <string>

#include "random.h"
#include "uint256.h"

// Bitcoin Core's translation function (unused in libblsct API)
std::function<std::string(const char*)> G_TRANSLATION_FUN = nullptr;

// Random number primitives used by blsct internals
uint256 FastRandomContext::rand256() noexcept
{
    uint256 result;
    FILE* f = fopen("/dev/urandom", "rb");
    if (f) {
        fread(result.data(), 1, 32, f);
        fclose(f);
    }
    return result;
}

uint64_t GetRandInternal(uint64_t nMax) noexcept
{
    uint64_t val = 0;
    FILE* f = fopen("/dev/urandom", "rb");
    if (f) {
        fread(&val, 1, sizeof(val), f);
        fclose(f);
    }
    return nMax ? (val % nMax) : 0;
}
