# Navio BLS Confidential Transaction Library

TypeScript bindings for the `libblsct` library used by the
[Navio](https://nav.io/) blockchain to construct confidential transactions based
on the BLS12-381 curve.

## Features

- **Node.js**: Native C++ bindings for maximum performance
- **Browser**: WebAssembly (WASM) module for browser compatibility

## Requirements

### Node.js

- Node.js v18 or higher
- g++, make, swig, autoconf, automake, libtool and pkg-config to build
  underlying C++ libraries

### Browser

- Modern browser with WebAssembly support
- No native dependencies required

## Installation

```bash
npm install navio-blsct
```

The npm package includes:

- **Pre-built WASM files** for browser/WebAssembly use (no additional build
  required)
- **Source code** for Node.js native bindings (automatically built during
  installation)

For Node.js, installation includes building native C++ libraries from source
(may take a few minutes). Browser/WASM usage works immediately without any build
step.

## Usage

### Node.js

```typescript
import { Scalar, Point, BlsctChain, setChain } from 'navio-blsct';

// Set the network
setChain(BlsctChain.Mainnet);

// Generate a random scalar
const scalar = Scalar.random();
console.log('Random scalar:', scalar.toHex());

// Generate a point from the scalar
const point = Point.fromScalar(scalar);
console.log('Point:', point.toHex());
```

### Browser

For browser usage, import from the `/browser` subpath and initialize the WASM
module first. **The WASM files are pre-built and included in the npm package**,
so no additional build steps are needed:

```typescript
import {
  loadBlsctModule,
  Scalar,
  Point,
  BlsctChain,
  setChain,
} from 'navio-blsct/browser';

// Initialize WASM module (required before using any functions)
// This loads the pre-built WASM files from the package
await loadBlsctModule();

// Now use the library as normal
setChain(BlsctChain.Mainnet);

const scalar = Scalar.random();
console.log('Random scalar:', scalar.toHex());
```

### Bundler Configuration

If your bundler automatically resolves the `browser` field in `package.json`,
you may be able to use the standard import:

```typescript
import { loadBlsctModule, Scalar } from 'navio-blsct';

await loadBlsctModule();
// ...
```

## API Reference

Full API reference and usage examples are available in the
[documentation](https://nav-io.github.io/libblsct-bindings/ts/).

## Building from Source

**Note:** Building from source is only needed for development or if you want to
modify the library. Users installing from npm get pre-built WASM files and don't
need to build them.

### Node.js (Native)

```bash
cd ffi/ts
npm install
```

### Browser (WASM)

**Pre-built WASM files are included in the npm package** for browser usage.
Building from source is only needed if you're developing or modifying the
library.

To build WASM files from source,
[Emscripten](https://emscripten.org/docs/getting_started/downloads.html) must be
installed and activated:

```bash
cd ffi/ts
npm install --ignore-scripts
npm run build:wasm
npm run build:browser
```

The WASM build process:

1. Clones the navio-core repository (if not already present)
2. Compiles the C++ source files to WebAssembly using Emscripten
3. Outputs `blsct.js` and `blsct.wasm` to the `wasm/` directory
4. These files are included when publishing to npm but are gitignored during
   development

## License

MIT
