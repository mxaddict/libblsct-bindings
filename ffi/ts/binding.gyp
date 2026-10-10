{
  'targets': [
    {
      'target_name': 'blsct',
      'include_dirs': [
         '<(module_root_dir)/navio-core/src/blst/bindings',
         '<(module_root_dir)/navio-core/src',
      ],
      'sources': [
        './swig/blsct_wrap.cxx',
      ],
      'conditions': [
        ['OS=="win"', {
          # MSVC takes archives by path; scripts/build.js copies the CMake
          # Release outputs here under these names.
          'link_settings': {
            'libraries': [
              '<(module_root_dir)/libs/blsct.lib',
              '<(module_root_dir)/libs/univalue_blsct.lib',
              '<(module_root_dir)/libs/blst.lib'
            ]
          },
          'msvs_settings': {
            'VCCLCompilerTool': {
              'AdditionalOptions': ['/std:c++20', '/Zc:__cplusplus'],
              # Synchronous C++ exceptions (/EHsc): the wrapper throws.
              'ExceptionHandling': 1
            }
          },
          # navio-core's CMake builds libblsct against the DLL CRT (/MD)
          # outside a static vcpkg triplet, so the addon has to match or the
          # link fails on mismatched RuntimeLibrary. node-gyp sets /MT per
          # configuration, which a target-level setting does not override.
          'configurations': {
            'Release': {
              'msvs_settings': { 'VCCLCompilerTool': { 'RuntimeLibrary': 2 } }
            }
          }
        }, {
          'link_settings': {
            'library_dirs': [
              '<(module_root_dir)/libs'
            ],
            'libraries': [
              '-lblsct',
              '-lunivalue_blsct',
              '-lblst'
            ]
          }
        }]
      ],
      'cflags_cc': ['-std=c++20', '-fPIC', '-fexceptions'],
      'xcode_settings': {
        'CLANG_CXX_LANGUAGE_STANDARD': 'c++20 -fexceptions',
        'OTHER_CFLAGS': ['-std=c++20 -fexceptios'],
        'OTHER_CPLUSPLUSFLAGS': ['-std=c++20', '-fexceptions'],
			  'OTHER_LDFLAGS': [
        ],
			  'OTHER_LDFLAGS!': [
        ],
      }
    }
  ]
}
