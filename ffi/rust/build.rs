//! Builds navio-core's standalone libblsct at the commit pinned in
//! navio-core.sha (a copy of the repository-wide ffi/navio-core.sha) and links
//! it into the crate.
//!
//! - `BLSCT_PREBUILT_DIR`: link archives built elsewhere for the same pin (CI
//!   builds them once per runner image, see .github/actions/libblsct). A
//!   directory whose navio-core.sha marker names another commit is refused.
//! - `BLSCT_LOCAL_NAVIO_CORE=1`: build the checkout already in
//!   target/navio-core as-is instead of the pinned commit.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

const NAVIO_CORE_REPO: &str = "https://github.com/nav-io/navio-core";
const PIN_FILE: &str = "navio-core.sha";

/// CMake targets linked into the crate, in link order. univalue is renamed
/// univalue_blsct when copied, as in the other bindings.
const TARGETS: [(&str, &str); 3] = [
  ("blsct", "blsct"),
  ("univalue", "univalue_blsct"),
  ("blst", "blst"),
];

fn manifest_dir() -> PathBuf {
  PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set"))
}

fn read_pin(path: &Path) -> String {
  let sha = fs::read_to_string(path)
    .unwrap_or_else(|e| panic!("Failed to read {}: {e}", path.display()))
    .trim()
    .to_owned();
  let is_sha = sha.len() == 40 && sha.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'));
  assert!(
    is_sha,
    "{} must hold one full 40-character commit SHA, got '{sha}'",
    path.display()
  );
  sha
}

/// MSVC names a static library `<name>.lib`, every other toolchain `lib<name>.a`.
fn archive_file_name(name: &str, is_msvc: bool) -> String {
  if is_msvc {
    format!("{name}.lib")
  } else {
    format!("lib{name}.a")
  }
}

fn run(cmd: &mut Command) {
  let status = cmd
    .status()
    .unwrap_or_else(|e| panic!("Failed to run {cmd:?}: {e}"));
  assert!(status.success(), "{cmd:?} failed: {status}");
}

/// Puts `navio_core_path` at `sha` without deleting anything: a fresh
/// directory becomes a repository, an existing checkout fetches the commit.
fn checkout_navio_core(navio_core_path: &Path, sha: &str) {
  if !navio_core_path.join(".git").exists() {
    fs::create_dir_all(navio_core_path).unwrap();
    run(
      Command::new("git")
        .arg("init")
        .arg("-q")
        .current_dir(navio_core_path),
    );
  }
  run(
    Command::new("git")
      .args(["fetch", "-q", "--depth", "1", NAVIO_CORE_REPO, sha])
      .current_dir(navio_core_path),
  );
  run(
    Command::new("git")
      .args(["checkout", "-q", sha])
      .current_dir(navio_core_path),
  );
}

/// Finds a build output by file name, wherever the generator put it (Visual
/// Studio adds a per-configuration directory).
fn find_file(dir: &Path, file_name: &str) -> Option<PathBuf> {
  for entry in fs::read_dir(dir).ok()?.flatten() {
    let path = entry.path();
    if path.is_dir() {
      if path.file_name().is_some_and(|n| n == "CMakeFiles") {
        continue;
      }
      if let Some(found) = find_file(&path, file_name) {
        return Some(found);
      }
    } else if path.file_name().is_some_and(|n| n == file_name) {
      return Some(path);
    }
  }
  None
}

fn build_libblsct(navio_core_path: &Path) -> PathBuf {
  let build_path = navio_core_path.join("build");
  println!("Configuring navio-core (CMake, BUILD_LIBBLSCT_ONLY)...");
  run(Command::new("cmake").args([
    "-S",
    &navio_core_path.display().to_string(),
    "-B",
    &build_path.display().to_string(),
    "-DBUILD_LIBBLSCT_ONLY=ON",
    "-DCMAKE_BUILD_TYPE=Release",
    "-DBUILD_TESTS=OFF",
    "-DBUILD_BENCH=OFF",
    "-DCMAKE_POSITION_INDEPENDENT_CODE=ON",
  ]));

  println!("Building libblsct...");
  let mut build = Command::new("cmake");
  build.args([
    "--build",
    &build_path.display().to_string(),
    "--config",
    "Release",
    "--target",
  ]);
  build.args(TARGETS.map(|(target, _)| target));
  build.args(["-j", &num_cpus::get().to_string()]);
  run(&mut build);
  build_path
}

/// Copies each archive from `find_archive` into `libs_path` under its link name.
fn copy_archives(libs_path: &Path, is_msvc: bool, find_archive: impl Fn(&str) -> PathBuf) {
  fs::create_dir_all(libs_path).unwrap();
  for (target, link_name) in TARGETS {
    let src = find_archive(&archive_file_name(target, is_msvc));
    let dest = libs_path.join(archive_file_name(link_name, is_msvc));
    println!("Copying {} to {}...", src.display(), dest.display());
    fs::copy(&src, &dest).unwrap_or_else(|e| panic!("Failed to copy {}: {e}", src.display()));
  }
}

fn main() {
  let manifest_dir = manifest_dir();
  let pin_path = manifest_dir.join(PIN_FILE);
  println!("cargo:rerun-if-changed=build.rs");
  println!("cargo:rerun-if-changed={}", pin_path.display());
  println!("cargo:rerun-if-env-changed=BLSCT_PREBUILT_DIR");
  println!("cargo:rerun-if-env-changed=BLSCT_LOCAL_NAVIO_CORE");

  let sha = read_pin(&pin_path);
  // The target, not the host this script runs on, decides the toolchain.
  let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();
  let target_env = env::var("CARGO_CFG_TARGET_ENV").unwrap();
  let is_msvc = target_env == "msvc";
  assert!(
    target_os != "windows" || is_msvc,
    "navio-blsct builds libblsct with MSVC on Windows; the {target_env} target is not supported"
  );

  let navio_core_path = manifest_dir.join("target").join("navio-core");
  let libs_path = manifest_dir.join("libs");
  let marker_path = libs_path.join(PIN_FILE);
  let local_core = env::var("BLSCT_LOCAL_NAVIO_CORE").is_ok_and(|v| v == "1");

  if let Ok(prebuilt) = env::var("BLSCT_PREBUILT_DIR") {
    let prebuilt = PathBuf::from(prebuilt);
    let built_sha = fs::read_to_string(prebuilt.join(PIN_FILE)).unwrap_or_default();
    assert!(
      built_sha.trim() == sha,
      "BLSCT_PREBUILT_DIR holds libblsct built from '{}', but the pin is {sha}",
      built_sha.trim()
    );
    copy_archives(&libs_path, is_msvc, |name| prebuilt.join(name));
    fs::write(&marker_path, &sha).unwrap();
  } else {
    let cached = !local_core
      && fs::read_to_string(&marker_path).is_ok_and(|s| s.trim() == sha)
      && TARGETS.iter().all(|(_, link_name)| {
        libs_path
          .join(archive_file_name(link_name, is_msvc))
          .exists()
      });
    if !cached {
      if local_core {
        assert!(
          navio_core_path
            .join("src/blsct/external_api/blsct.h")
            .exists(),
          "BLSCT_LOCAL_NAVIO_CORE=1 but {} is not a navio-core checkout",
          navio_core_path.display()
        );
      } else {
        checkout_navio_core(&navio_core_path, &sha);
      }
      let build_path = build_libblsct(&navio_core_path);
      copy_archives(&libs_path, is_msvc, |name| {
        find_file(&build_path, name)
          .unwrap_or_else(|| panic!("No {name} under {}", build_path.display()))
      });
      // A local checkout is not the pinned commit, so never mark it as one.
      fs::write(
        &marker_path,
        if local_core { "local" } else { sha.as_str() },
      )
      .unwrap();
    }
  }

  println!("cargo:rustc-link-search=native={}", libs_path.display());
  for (_, link_name) in TARGETS {
    println!("cargo:rustc-link-lib=static={link_name}");
  }
  // MSVC pulls in its C++ runtime through the archives' default-library
  // directives; other toolchains need it named.
  match target_os.as_str() {
    _ if is_msvc => {}
    "macos" | "ios" => println!("cargo:rustc-link-lib=c++"),
    _ => println!("cargo:rustc-link-lib=stdc++"),
  }
}
