# Native library for the C# binding: the SWIG C# wrapper linked against the
# static archives of a navio-core BUILD_LIBBLSCT_ONLY build into one shared
# library named "blsct" (blsct.dll, libblsct.so, libblsct.dylib), the name the
# generated P/Invoke code imports. ffi/csharp/build-native.sh drives it.
cmake_minimum_required(VERSION 3.22)
project(navio_blsct_csharp_native LANGUAGES C CXX)

set(NAVIO_CORE_DIR "" CACHE PATH "navio-core checkout whose libblsct is linked")
set(NAVIO_ARCHIVE_DIR "${NAVIO_CORE_DIR}/build" CACHE PATH
  "Where the libblsct archives are: navio-core's build tree, or a directory of prebuilt archives")
if(NOT EXISTS "${NAVIO_CORE_DIR}/src/blsct/external_api/blsct.h")
  message(FATAL_ERROR "NAVIO_CORE_DIR must point at a navio-core checkout, got '${NAVIO_CORE_DIR}'")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# navio-core builds libblsct against the DLL CRT (/MD) outside a static vcpkg
# triplet; the shared library has to match or the link fails.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")

find_package(SWIG 4.3 REQUIRED)

set(CSHARP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/..")
set(SWIG_OUT "${CMAKE_CURRENT_BINARY_DIR}/swig")
add_custom_command(
  OUTPUT "${SWIG_OUT}/blsct_wrap.cxx"
  COMMAND "${CMAKE_COMMAND}" -E make_directory "${SWIG_OUT}"
  COMMAND "${SWIG_EXECUTABLE}" -c++ -csharp -namespace NavioBlsct -dllimport blsct
          -outdir "${SWIG_OUT}" -o "${SWIG_OUT}/blsct_wrap.cxx" "${CSHARP_DIR}/blsct.i"
  DEPENDS "${CSHARP_DIR}/blsct.i" "${CSHARP_DIR}/../blsct.i"
  COMMENT "Generating the SWIG C# wrapper"
  VERBATIM)

# The archives the TS and Python bindings link too. Visual Studio generators
# put them in a per-configuration subdirectory.
foreach(lib IN ITEMS blsct blst univalue)
  find_library(NAVIO_${lib}_ARCHIVE
    NAMES ${lib}
    PATHS "${NAVIO_ARCHIVE_DIR}" "${NAVIO_ARCHIVE_DIR}/lib" "${NAVIO_ARCHIVE_DIR}/src/univalue"
    PATH_SUFFIXES Release
    NO_DEFAULT_PATH
    REQUIRED)
endforeach()

add_library(blsct SHARED "${SWIG_OUT}/blsct_wrap.cxx")
target_include_directories(blsct PRIVATE
  "${NAVIO_CORE_DIR}/src"
  "${NAVIO_CORE_DIR}/src/blst/bindings")
target_link_libraries(blsct PRIVATE
  "${NAVIO_blsct_ARCHIVE}"
  "${NAVIO_univalue_ARCHIVE}"
  "${NAVIO_blst_ARCHIVE}")
if(WIN32)
  target_compile_definitions(blsct PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
  target_compile_options(blsct PRIVATE /bigobj /utf-8)
endif()
