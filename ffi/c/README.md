# C Binding

## Building required libraries

To build the libraries needed to use the `libblsct` API from C, run the
following command from the repository root:

```bash
./script/build-libblsct.sh
```

This will generate the following static libraries in the `lib` directory:

- libbls384_256.a
- libblsct.a
- libmcl.a
- libunivalue_blsct.a

The main entry point is `libblsct.a`, which contains the public API. The other
libraries are its dependencies and must be linked together when building your C
application.

## Header File

Use the following header to access the C API:

- [blsct.h](https://github.com/nav-io/navio-core/blob/master/src/blsct/external_api/blsct.h)

## API Documentation

Formal documentation for the C API is not yet available. However, you can refer
to the Python and JavaScript wrapper implementations as practical usage examples
of the libblsct API.
