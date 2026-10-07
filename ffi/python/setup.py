import itertools
import multiprocessing
import os
import re
import sys
from pathlib import Path
from setuptools import setup, Extension, find_packages
from distutils.command.build import build as build_org
from setuptools.command.build_ext import build_ext
import shutil
import subprocess

# TODO: turn this on for production builds
IS_PROD = True

# setuptools drives MSVC on Windows, which needs its own archive names and
# compiler flags below.
IS_MSVC = sys.platform == "win32"

std_cpp = "/std:c++20" if IS_MSVC else "-std=c++20"


def _on_rmtree_error(func, path, exc):
  # git checkouts on Windows leave read-only objects; clear the bit and retry
  import stat
  os.chmod(path, stat.S_IWRITE)
  func(path)


def rmtree(path):
  shutil.rmtree(path, onexc=_on_rmtree_error)

package_dir = Path(os.path.abspath(os.path.dirname(__file__)))

# Copy the shared SWIG contract into the package tree so it is included in the
# sdist and available when building from a downloaded sdist (where ffi/blsct.i
# is outside the package root and therefore absent).
_shared_i_src = package_dir.parent / "blsct.i"
_shared_i_dst = package_dir / "blsct.i"
if _shared_i_src.exists():
  shutil.copy2(_shared_i_src, _shared_i_dst)

def read_navio_core_pin():
  # The package's copy of the repository-wide pin in ffi/navio-core.sha, kept
  # here (and in the sdist) because the wheel is built from this directory.
  # script/sync-navio-core-pin.sh refreshes it; CI fails if it drifts.
  pin_path = package_dir / "navio-core.sha"
  sha = pin_path.read_text(encoding="utf-8").strip()
  if not re.fullmatch(r"[0-9a-f]{40}", sha):
    raise ValueError(f"{pin_path} must hold one full 40-character navio-core commit SHA, got '{sha}'")
  return sha

if IS_PROD:
  navio_core_repo = "https://github.com/nav-io/navio-core"
  navio_core_master_sha = read_navio_core_pin()
else:
  navio_core_repo = "https://github.com/gogoex/navio-core"
  navio_core_branch = ""

navio_core_dir = package_dir / "navio-core"
# navio-core v0.1.0+ uses an out-of-source CMake build tree.
cmake_build_dir = navio_core_dir / "build"
navio_tmp_dir = Path.home() / ".navio-tmp"

libs_dir = navio_tmp_dir / "libs"
# The navio-core commit the cached archives in libs_dir were built from. They
# are reused only for that same commit, so bumping the pin rebuilds them
# instead of linking stale archives against new headers.
libs_cache_sha_path = libs_dir / "navio-core.sha"

# Static archives produced by the CMake BUILD_LIBBLSCT_ONLY build, all in the
# out-of-source build tree: libblsct, the vendored supranational/blst it does
# its curve arithmetic with, and univalue.
if IS_MSVC:
  # MSVC: located by name after the build (see find_msvc_archives), since the
  # output dir depends on the generator.
  msvc_archive_names = [
    "blsct.lib",
    "univalue.lib",
    "blst.lib",
  ]
  src_dot_a_files = []  # filled in by find_msvc_archives()
  dest_dot_a_files = [libs_dir / name for name in msvc_archive_names]
else:
  src_dot_a_files = [
    cmake_build_dir / "lib" / "libblsct.a",
    cmake_build_dir / "src" / "univalue" / "libunivalue.a",
    cmake_build_dir / "lib" / "libblst.a",
  ]
  dest_dot_a_files = [
    libs_dir / "libblsct.a",
    libs_dir / "libunivalue_blsct.a",
    libs_dir / "libblst.a",
  ]


def find_msvc_archives():
  """Locate the MSVC static libs in the cmake build tree by file name."""
  found = []
  for name in msvc_archive_names:
    matches = [p for p in cmake_build_dir.rglob(name) if p.is_file()]
    if not matches:
      raise FileNotFoundError(f"{name} not found under {cmake_build_dir}")
    found.append(matches[0])
  return found

def log(s):
  print(f"===> {s}")

class CustomBuildExt(build_ext):
  def clone_navio_core(self):
    if os.path.isdir(navio_core_dir):
      rmtree(navio_core_dir)

    cmd = ["git", "clone", "--depth", "1"]
    if not IS_PROD:
      cmd += ["--branch", navio_core_branch]
    cmd += [navio_core_repo, navio_core_dir]

    subprocess.run(cmd, check=True)

    if IS_PROD:
      subprocess.run(
        ["git", "fetch", "--depth", "1", "origin", navio_core_master_sha],
        cwd=navio_core_dir,
        check=True,
      )
      log(f"Fetched navio-core commit {navio_core_master_sha}")

      subprocess.run(
        ["git", "checkout", navio_core_master_sha],
        cwd=navio_core_dir,
        check=True,
      )
      log(f"Checked out navio-core commit {navio_core_master_sha}")


  def build_libblsct(self, num_cpus: str):
    # navio-core v0.1.0+ builds with CMake. BUILD_LIBBLSCT_ONLY builds the
    # standalone libblsct.a and disables all node/wallet/daemon targets, so no
    # autotools `depends` prefix is required — blst, univalue and secp256k1
    # are vendored in-tree.
    if os.path.isdir(cmake_build_dir):
      rmtree(cmake_build_dir)

    configure_cmd = [
      "cmake",
      "-S", str(navio_core_dir),
      "-B", str(cmake_build_dir),
      "-DBUILD_LIBBLSCT_ONLY=ON",
      "-DCMAKE_BUILD_TYPE=Release",
      "-DBUILD_TESTS=OFF",
      "-DBUILD_BENCH=OFF",
      "-DCMAKE_POSITION_INDEPENDENT_CODE=ON",
    ]
    # blst is named explicitly: a static library's private link dependency is
    # not built by `--target blsct` alone.
    build_cmd = [
      "cmake",
      "--build", str(cmake_build_dir),
      "--target", "blsct", "blst", "univalue",
      "-j", num_cpus,
    ]
    if IS_MSVC:
      # Ninja gives a single-config tree; needs cl.exe on PATH (vcvars).
      # Fall back to the default (Visual Studio) generator otherwise.
      if shutil.which("ninja"):
        configure_cmd += ["-G", "Ninja"]
      else:
        build_cmd += ["--config", "Release"]
      # match the /MD runtime that CPython extension modules are built with
      configure_cmd += ["-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDLL"]

    log("Configuring navio-core (CMake, BUILD_LIBBLSCT_ONLY)...")
    subprocess.run(configure_cmd, cwd=navio_core_dir, check=True)

    log("Building libblsct...")
    subprocess.run(build_cmd, cwd=navio_core_dir, check=True)

    if IS_MSVC:
      src_dot_a_files[:] = find_msvc_archives()

    os.makedirs(libs_dir, exist_ok=True)
    for (src, dest) in zip(src_dot_a_files, dest_dot_a_files):
      if os.path.exists(src):
        shutil.copy2(src, dest)
        log(f"Copyied {src} to {dest}")
    if IS_PROD:
      libs_cache_sha_path.write_text(navio_core_master_sha + "\n", encoding="utf-8")

  @staticmethod
  def cached_libs_match_pin():
    if not IS_PROD or not all(os.path.exists(f) for f in dest_dot_a_files):
      return False
    if not libs_cache_sha_path.is_file():
      return False
    return libs_cache_sha_path.read_text(encoding="utf-8").strip() == navio_core_master_sha

  def run(self):
    # only blsct.h is needed actually, but clone the entire tree
    # for the sake of simplicity
    self.clone_navio_core()

    # reuse the cached archives when they were built from the pinned commit
    if self.cached_libs_match_pin():
      log(f"Reusing archives built from navio-core {navio_core_master_sha}...")
      for (src, dest) in zip(src_dot_a_files, dest_dot_a_files):
        shutil.copy2(dest, src)
        log(f"Copyied {dest} to {src}")
    else:
      # build .a files
      log("Building .a files...")
      num_cpus = str(multiprocessing.cpu_count())
      self.build_libblsct(num_cpus)

    super().run()

def print_directory_structure(start_path, level=0):
  if level == 0:
    print("----")
  exclude_dirs = ["venv", "__pycache__", "build", "dist", "navio-core", "swig"]
  prefix = " " * (level * 2)
  for item in os.listdir(start_path):
    item_path = os.path.join(start_path, item)
    if os.path.isdir(item_path):
      if item in exclude_dirs:
        print(f"{prefix}📂 {item}/")
        continue
      print(f"{prefix}📂 {item}/")
      print_directory_structure(item_path, level + 1)
    else:
      print(f"{prefix}📄 {item}")

class build(build_org):
  @staticmethod
  def partition(pred, iterable):
    a, b = itertools.tee(iterable)
    return itertools.filterfalse(pred, a), filter(pred, b)

  def finalize_options(self):
    super().finalize_options()
    pred = lambda el: el[0] == 'build_ext'
    rest, sub_build_ext = self.partition(pred, self.sub_commands)
    self.sub_commands[:] = list(sub_build_ext) + list(rest)

import sysconfig

python_include_dirs = list(dict.fromkeys(
  d for d in (sysconfig.get_paths().get("include"), sysconfig.get_paths().get("platinclude")) if d
))

if IS_MSVC:
  extra_compile_args = [std_cpp, "/EHsc", "/bigobj", "/utf-8", "/Zc:__cplusplus", "/Zc:preprocessor"]
  extra_link_args = []
  define_macros = [
    ("NOMINMAX", None),
    ("WIN32_LEAN_AND_MEAN", None),
    ("_WIN32_WINNT", "0x0A00"),
    ("_CRT_SECURE_NO_WARNINGS", None),
  ]
  # the archives are passed as extra_objects; only system import libs here
  libraries = ["kernel32", "user32", "advapi32", "shell32", "ws2_32", "iphlpapi"]
else:
  extra_compile_args = [std_cpp]
  extra_link_args = [std_cpp]
  if sys.platform == "darwin":
    extra_link_args += ["-undefined", "dynamic_lookup"]
  define_macros = []
  libraries = ["blsct", "univalue_blsct", "blst"]

swig_module = Extension(
  "blsct._blsct",
  sources=[
    "blsct/blsct.i",
  ],
  include_dirs=[
    *python_include_dirs,
    os.path.join(navio_core_dir, "src"),
    os.path.join(navio_core_dir, "src/blst/bindings"),
  ],
  define_macros=define_macros,
  library_dirs=[str(libs_dir)],
  libraries=libraries,
  extra_compile_args=extra_compile_args,
  extra_objects=[str(p) for p in dest_dot_a_files],
  extra_link_args=extra_link_args,
  swig_opts=[
    "-c++",
  ],
)

setup(
  py_modules=["blsct"],
  ext_modules=[swig_module],
  cmdclass={
    "build": build,
    "build_ext": CustomBuildExt,
  },
  packages=find_packages(),
)

#print_directory_structure(".")
