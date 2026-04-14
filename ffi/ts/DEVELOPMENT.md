## Building `blsct.node` module

1. Build `libblsct.a` and its dependencies, and swig c++ wrapper.
   ```bash
   node scripts/build.js
   ```
2. Build `blsct.node` module.
   ```bash
   npx node-gyp configure build
   ```

## Running unit test

```
npm run test
```

## Testing BLSCT wrapper classes in REPL

1. Start `node` from `ffi/ts` directory
2. Require `navio-blsct` package

   ```javascript
   const blsct = require('navio-blsct');
   ```

3. Import blsct wrapper classes from 'blsct' varaiable. e.g.:

   ```javascript
   const { Scalar } = blsct;
   ```
