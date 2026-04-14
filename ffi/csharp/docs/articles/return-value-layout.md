# Native Return Value Layout

All native functions in `libblsct` return a pointer to a `RetVal` struct
rather than returning values directly. This allows the library to
communicate both a status code and a payload in one allocation.

## Struct layout

| Offset | Size | Field |
|---|---|---|
| `0` | 1 byte | Result code (`0` = success, non-zero = error) |
| `IntPtr.Size` | `IntPtr.Size` bytes | Value pointer |
| `IntPtr.Size * 2` | `nuint` | Value size |

On a 64-bit runtime `IntPtr.Size` is 8, so the total struct size is 24 bytes.
On a 32-bit runtime it is 12 bytes.

## Internal helpers

Two `internal` methods read fields from this struct:

- `Blsct.ReadResultCode(IntPtr retVal)` — reads the byte at offset 0.
- `Blsct.ReadValuePtr(IntPtr retVal)` — reads the pointer at offset `IntPtr.Size`.

`Blsct.EnsureSuccess(IntPtr retVal)` calls `ReadResultCode` and throws
`InvalidOperationException` when the code is non-zero.

These members are `internal` but are exposed to the `NavioBlsct.Tests`
assembly via `[assembly: InternalsVisibleTo("NavioBlsct.Tests")]`.
