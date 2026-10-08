const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync, spawnSync } = require('child_process')
const { readNavioCorePin } = require('./navio-core-pin')

// Configuration
const IS_PROD = true

// Production: clone by specific SHA from nav-io/navio-core. Every binding
// builds from the same commit, pinned in ffi/navio-core.sha.
const MASTER_SHA = readNavioCorePin()
const NAVIO_CORE_REPO = IS_PROD
  ? 'https://github.com/nav-io/navio-core'
  : 'https://github.com/gogoex/navio-core'
const NAVIO_CORE_BRANCH = IS_PROD ? 'master' : 'development-branch-name'
const LIBS_CACHE_META_BASENAME = '.build-cache-meta.json'
const LIBS_CACHE_VERSION = 'navio-core-blst-1'

// Linux apt packages required for building (swig is installed separately only if needed)
// navio-core v0.1.0+ builds with CMake instead of autotools.
const LINUX_APT_PACKAGES = [
  'cmake',
  'pkg-config',
  'git',
  'python3',
  'build-essential'
]

// macOS brew packages required for building (swig is installed separately only if needed)
const MACOS_BREW_PACKAGES = [
  'cmake',
  'pkg-config',
  'git'
]

// ============================================================================
// Helper Functions
// ============================================================================

function isLinux() {
  return process.platform === 'linux'
}

function isDarwin() {
  return process.platform === 'darwin'
}

function isWindows() {
  return process.platform === 'win32'
}

function isRoot() {
  return typeof process.getuid === 'function' && process.getuid() === 0
}

function hasCmd(cmd) {
  try {
    // `command -v` is a POSIX shell builtin; cmd.exe has `where` instead.
    execSync(isWindows() ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function archiveHasSymbols(archivePath, requiredSymbols) {
  if (!fs.existsSync(archivePath)) return false
  if (!hasCmd('nm')) return false

  try {
    const nmOut = execSync(`nm ${archivePath}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 50 * 1024 * 1024,
    }).toString()

    return requiredSymbols.every((sym) => {
      const re = new RegExp(`\\b${sym}\\b`)
      return re.test(nmOut)
    })
  } catch {
    return false
  }
}

function readCacheMeta(metaPath) {
  if (!fs.existsSync(metaPath)) return null
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  } catch {
    return null
  }
}

function shouldAllowApt() {
  // Explicit opt-in for non-root runs (e.g., CI images where sudo is available)
  return process.env.BLSCT_BUILD_ALLOW_APT === '1'
}

function isAptPkgInstalled(pkg) {
  if (!hasCmd('dpkg-query')) return false

  try {
    const out = execSync(`dpkg-query -W -f='\${Status}' ${pkg}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()

    return out.includes('install ok installed')
  } catch {
    return false
  }
}

function getMissingAptPkgs(pkgs) {
  return pkgs.filter((p) => !isAptPkgInstalled(p))
}

function ensureLinuxAptDeps(pkgs) {
  if (!isLinux()) return

  const aptAvailable = hasCmd('apt-get') || hasCmd('apt')
  if (!aptAvailable) {
    console.error(
      `[navio-blsct] Linux detected but apt/apt-get not found.\n` +
      `Install system dependencies manually: ${pkgs.join(', ')}\n`
    )
    process.exit(1)
  }

  // If dpkg-query isn't present, we can't reliably check installation status
  const canCheck = hasCmd('dpkg-query')
  const missing = canCheck ? getMissingAptPkgs(pkgs) : pkgs.slice()

  if (missing.length === 0) {
    console.log(`[navio-blsct] System deps already installed.`)
    return
  }

  const installCmd = `apt-get update && apt-get install -y ${missing.join(' ')}`
  const sudoInstallCmd = `sudo ${installCmd}`

  // Non-root default: do not run apt/sudo
  if (!isRoot() && !shouldAllowApt()) {
    console.error(
      `[navio-blsct] Missing system dependencies: ${missing.join(', ')}\n` +
      `This build script will not run apt automatically without privileges.\n\n` +
      `Install them manually, e.g.:\n  ${sudoInstallCmd}\n\n` +
      `Or re-run with:\n  BLSCT_BUILD_ALLOW_APT=1 npm install\n`
    )
    process.exit(1)
  }

  // If non-root but allowed, require sudo
  if (!isRoot() && shouldAllowApt() && !hasCmd('sudo')) {
    console.error(
      `[navio-blsct] BLSCT_BUILD_ALLOW_APT=1 was set but sudo is not available.\n` +
      `Install deps manually or run the build as root.\n` +
      `Missing: ${missing.join(', ')}\n`
    )
    process.exit(1)
  }

  console.log(
    `[navio-blsct] Installing missing Linux system deps via apt: ${missing.join(', ')}`
  )

  execSync(isRoot() ? installCmd : sudoInstallCmd, { stdio: 'inherit' })
}

function ensureMacOSDeps(pkgs) {
  if (!isDarwin()) return

  if (!hasCmd('brew')) {
    console.log('[navio-blsct] Homebrew not found. Assuming dependencies are installed.')
    return
  }

  console.log('[navio-blsct] Installing system dependencies with Homebrew...')
  // brew install is idempotent - it will skip already installed packages
  const result = spawnSync('brew', ['install', ...pkgs], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.warn('[navio-blsct] brew install had non-zero exit, continuing anyway...')
  }

  // Link packages that are installed but not linked (e.g. after brew upgrade)
  // so the build toolchain (cmake, pkg-config) is on PATH.
  console.log('[navio-blsct] Ensuring Homebrew packages are linked...')
  for (const pkg of pkgs) {
    const linkRes = spawnSync('brew', ['link', pkg], { stdio: 'pipe' })
    if (linkRes.status !== 0 && linkRes.stderr) {
      const err = linkRes.stderr.toString()
      if (!err.includes('Already linked') && !err.includes('would conflict')) {
        console.warn(`[navio-blsct] brew link ${pkg} had non-zero exit (may be already linked)`)
      }
    }
  }
}

function ensureSwigInstalled() {
  // Already have swig installed
  if (hasCmd('swig')) return true

  console.log('[navio-blsct] SWIG not found, attempting to install...')

  if (isLinux()) {
    const aptAvailable = hasCmd('apt-get') || hasCmd('apt')
    if (!aptAvailable) {
      console.error(
        `[navio-blsct] Linux detected but apt/apt-get not found.\n` +
        `Install SWIG manually to regenerate the wrapper.\n`
      )
      return false
    }

    if (!isRoot() && !shouldAllowApt()) {
      console.error(
        `[navio-blsct] SWIG is required to regenerate the wrapper but is not installed.\n` +
        `Install it manually:\n  sudo apt-get update && sudo apt-get install -y swig\n\n` +
        `Or re-run with:\n  BLSCT_BUILD_ALLOW_APT=1 npm install\n`
      )
      return false
    }

    if (!isRoot() && shouldAllowApt() && !hasCmd('sudo')) {
      console.error(
        `[navio-blsct] BLSCT_BUILD_ALLOW_APT=1 was set but sudo is not available.\n` +
        `Install SWIG manually or run the build as root.\n`
      )
      return false
    }

    const installCmd = 'apt-get update && apt-get install -y swig'
    const sudoInstallCmd = `sudo ${installCmd}`

    console.log('[navio-blsct] Installing SWIG via apt...')
    execSync(isRoot() ? installCmd : sudoInstallCmd, { stdio: 'inherit' })
    return true
  }

  if (isDarwin()) {
    if (!hasCmd('brew')) {
      console.error(
        `[navio-blsct] SWIG is required to regenerate the wrapper but is not installed.\n` +
        `Install Homebrew and run: brew install swig\n`
      )
      return false
    }

    console.log('[navio-blsct] Installing SWIG via Homebrew...')
    const result = spawnSync('brew', ['install', 'swig'], { stdio: 'inherit' })
    if (result.status !== 0) {
      console.error('[navio-blsct] Failed to install SWIG via Homebrew')
      return false
    }
    return true
  }

  console.error(
    `[navio-blsct] SWIG is required to regenerate the wrapper but is not installed.\n` +
    `Please install SWIG 4.1.0 or later manually.\n`
  )
  return false
}

// ============================================================================
// Build Configuration
// ============================================================================

const getCfg = () => {
  const baseDir = path.resolve(__dirname, '..')
  const swigDir = path.join(baseDir, 'swig')
  const navioCoreDir = path.join(baseDir, 'navio-core')
  // navio-core v0.1.0+ uses an out-of-source CMake build tree.
  const cmakeBuildDir = path.join(navioCoreDir, 'build')
  const libsDir = path.join(baseDir, 'libs')

  // Static archives produced by the CMake `BUILD_LIBBLSCT_ONLY` build. All
  // of them land in the out-of-source build tree: libblsct.a, the vendored
  // supranational/blst (src/blst, built by cmake/blst.cmake — assembly on
  // x86_64/arm64, portable C elsewhere) and univalue.
  //
  // On Windows the Visual Studio generator is multi-config: it puts each
  // archive in a per-configuration subdirectory and names it `<target>.lib`
  // rather than `lib<target>.a`. binding.gyp names the same files.
  const archive = (dir, target) => isWindows()
    ? path.join(dir, 'Release', `${target}.lib`)
    : path.join(dir, `lib${target}.a`)
  const libName = (name) => isWindows() ? `${name}.lib` : `lib${name}.a`
  const srcDotAFiles = [
    archive(path.join(cmakeBuildDir, 'lib'), 'blsct'),
    archive(path.join(cmakeBuildDir, 'src', 'univalue'), 'univalue'),
    archive(path.join(cmakeBuildDir, 'lib'), 'blst'),
  ]
  const destDotAFiles = [
    path.join(libsDir, libName('blsct')),
    path.join(libsDir, libName('univalue_blsct')),
    path.join(libsDir, libName('blst')),
  ]
  const libsCacheMetaPath = path.join(libsDir, LIBS_CACHE_META_BASENAME)

  return {
    swigDir,
    stdCpp: '-std=c++20',
    navioCoreRepo: NAVIO_CORE_REPO,
    navioCoreMasterSha: IS_PROD ? MASTER_SHA : '',
    navioCoreBranch: NAVIO_CORE_BRANCH,
    navioCoreDir,
    cmakeBuildDir,

    srcDotAFiles,
    destDotAFiles,
    libsDir,
    libsCacheMetaPath,
    libsCacheVersion: LIBS_CACHE_VERSION,
    requiredLibBlsctSymbols: [
      'create_string_map',
      'build_token_info',
      'calc_collection_token_hash',
      'derive_collection_token_key',
      'build_create_token_predicate',
      'build_mint_token_predicate',
      'build_mint_nft_predicate',
      'build_unsigned_create_token_output',
      'build_unsigned_mint_token_output',
      'build_unsigned_mint_token_output_with_transcript',
      'build_unsigned_mint_nft_output',
      'sign_unsigned_transaction',
      'set_unsigned_output_stake_delegation',
      'recover_stake_delegation_owner_info',
      'aggregate_transactions',
    ],
  }
}

// ============================================================================
// Build Steps
// ============================================================================

const gitCloneNavioCore = (cfg) => {
  // Local-source bypass for building against an in-place navio-core checkout
  // (e.g. an embargoed branch not on the public remote). When set, use the
  // existing navio-core dir as-is instead of wiping + cloning the pinned SHA.
  if (process.env.BLSCT_LOCAL_NAVIO_CORE === '1') {
    if (!fs.existsSync(cfg.navioCoreDir)) {
      throw new Error(`BLSCT_LOCAL_NAVIO_CORE=1 but ${cfg.navioCoreDir} does not exist`)
    }
    console.log(`Using existing local navio-core dir (BLSCT_LOCAL_NAVIO_CORE=1): ${cfg.navioCoreDir}`)
    return
  }

  // Remove existing directory
  if (fs.existsSync(cfg.navioCoreDir)) {
    fs.rmSync(cfg.navioCoreDir, { recursive: true, force: true })
    console.log(`Removed existing navio-core dir`)
  } else {
    console.log(`No existing navio-core dir found`)
  }

  const cmd = ['git', 'clone', '--depth', '1']
  if (cfg.navioCoreBranch !== '') {
    cmd.push('--branch', cfg.navioCoreBranch)
    console.log(`Using navio-core ${cfg.navioCoreBranch} branch...`)
  } else {
    console.log(`Using navio-core master branch...`)
  }
  cmd.push(cfg.navioCoreRepo, cfg.navioCoreDir)

  console.log(`Cloning navio-core from ${cfg.navioCoreRepo}...`)
  const res = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' })
  if (res.status !== 0) {
    throw new Error(`${cmd.join(' ')} failed: exit code ${res.status}`)
  }
  console.log(`✓ navio-core cloned successfully`)

  // For production, checkout specific SHA
  if (cfg.navioCoreMasterSha !== '') {
    const cwd = cfg.navioCoreDir
    {
      const fetchCmd = ['git', 'fetch', '--depth', '1', 'origin', cfg.navioCoreMasterSha]
      const fetchRes = spawnSync(fetchCmd[0], fetchCmd.slice(1), { cwd, stdio: 'inherit' })
      if (fetchRes.status !== 0) {
        throw new Error(`${fetchCmd.join(' ')} failed: exit code ${fetchRes.status}`)
      }
      console.log(`Fetched navio-core commit ${cfg.navioCoreMasterSha}`)
    }
    {
      const checkoutCmd = ['git', 'checkout', cfg.navioCoreMasterSha]
      const checkoutRes = spawnSync(checkoutCmd[0], checkoutCmd.slice(1), { cwd, stdio: 'inherit' })
      if (checkoutRes.status !== 0) {
        throw new Error(`${checkoutCmd.join(' ')} failed: exit code ${checkoutRes.status}`)
      }
      console.log(`Checked out navio-core commit ${cfg.navioCoreMasterSha}`)
    }
  }
}

const buildLibBlsct = (cfg, numCpus) => {
  // navio-core v0.1.0+ builds with CMake. The BUILD_LIBBLSCT_ONLY option
  // builds the standalone libblsct.a and disables every node/wallet/daemon
  // target, so no autotools `depends` prefix is required — blst, univalue
  // and secp256k1 are all vendored in-tree.
  if (fs.existsSync(cfg.cmakeBuildDir)) {
    fs.rmSync(cfg.cmakeBuildDir, { recursive: true, force: true })
  }

  console.log('Configuring navio-core (CMake, BUILD_LIBBLSCT_ONLY)...')
  const configureRes = spawnSync('cmake', [
    '-S', cfg.navioCoreDir,
    '-B', cfg.cmakeBuildDir,
    '-DBUILD_LIBBLSCT_ONLY=ON',
    '-DCMAKE_BUILD_TYPE=Release',
    '-DBUILD_TESTS=OFF',
    '-DBUILD_BENCH=OFF',
    '-DCMAKE_POSITION_INDEPENDENT_CODE=ON',
  ], {
    cwd: cfg.navioCoreDir,
    stdio: 'inherit',
  })
  if (configureRes.status !== 0) {
    throw new Error(`CMake configure failed: exit code ${configureRes.status}`)
  }

  // Build libblsct plus the in-tree static deps the node addon links
  // against (blst is named explicitly: a static library's private link
  // dependency is not built by `--target blsct` alone).
  // CMAKE_BUILD_TYPE only applies to single-config generators; the Visual
  // Studio one picks the configuration at build time and defaults to Debug.
  console.log('Building libblsct...')
  const buildRes = spawnSync('cmake', [
    '--build', cfg.cmakeBuildDir,
    '--config', 'Release',
    '--target', 'blsct', 'blst', 'univalue',
    '-j', String(numCpus),
  ], {
    cwd: cfg.navioCoreDir,
    stdio: 'inherit',
  })
  if (buildRes.status !== 0) {
    throw new Error(`Building libblsct failed: exit code ${buildRes.status}`)
  }

  // prepare a fresh libs dir
  if (fs.existsSync(cfg.libsDir)) {
    fs.rmSync(cfg.libsDir, { recursive: true, force: true })
  }
  fs.mkdirSync(cfg.libsDir, { recursive: true })

  // copy .a files to the libs dir
  const src_dest = cfg.srcDotAFiles.map((src, i) => [src, cfg.destDotAFiles[i]])
  for (const [src, dest] of src_dest) {
    console.log(`Copying ${src} to ${dest}...`)
    fs.copyFileSync(src, dest)
  }

  writeCacheMeta(cfg)
}

const writeCacheMeta = (cfg) => {
  const meta = {
    navioCoreSha: cfg.navioCoreMasterSha,
    cacheVersion: cfg.libsCacheVersion,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(cfg.libsCacheMetaPath, JSON.stringify(meta, null, 2))
}

// Install the archives of a libblsct built elsewhere for the same pin (CI
// builds it once per platform, see .github/actions/libblsct) instead of
// compiling navio-core here. A build from any other commit is refused.
const usePrebuiltLibs = (cfg, dir) => {
  const markerPath = path.join(dir, 'navio-core.sha')
  const builtSha = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8').trim() : ''
  if (builtSha !== cfg.navioCoreMasterSha) {
    throw new Error(`BLSCT_PREBUILT_DIR holds libblsct built from '${builtSha}', but the pin is ${cfg.navioCoreMasterSha}`)
  }
  const archiveName = (target) => isWindows() ? `${target}.lib` : `lib${target}.a`
  // Same order as cfg.destDotAFiles: blsct, univalue (as univalue_blsct), blst.
  const sources = ['blsct', 'univalue', 'blst'].map((target) => path.join(dir, archiveName(target)))
  fs.mkdirSync(cfg.libsDir, { recursive: true })
  sources.forEach((src, i) => {
    console.log(`Copying prebuilt ${src} to ${cfg.destDotAFiles[i]}...`)
    fs.copyFileSync(src, cfg.destDotAFiles[i])
  })
  writeCacheMeta(cfg)
}

const getSwigVersion = () => {
  try {
    const res = spawnSync('swig', ['-version'], { stdio: ['ignore', 'pipe', 'ignore'] })
    if (res.status !== 0) return null
    const output = res.stdout.toString()
    const match = output.match(/SWIG Version (\d+)\.(\d+)\.(\d+)/)
    if (!match) return null
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      string: `${match[1]}.${match[2]}.${match[3]}`
    }
  } catch {
    return null
  }
}

const shouldRegenerateWrapper = (cfg) => {
  const wrapperPath = path.join(cfg.swigDir, 'blsct_wrap.cxx')

  // Allow forcing regeneration via environment variable
  // Useful for developers who modify blsct.i
  if (process.env.BLSCT_REGENERATE_SWIG === '1') {
    console.log('[navio-blsct] BLSCT_REGENERATE_SWIG=1 set, forcing wrapper regeneration')
    return true
  }

  // If wrapper doesn't exist, we need to generate it
  if (!fs.existsSync(wrapperPath)) {
    console.log('[navio-blsct] SWIG wrapper not found, regeneration required')
    return true
  }

  // Check if wrapper has valid content and compatible SWIG version
  // npm doesn't preserve file mtimes, so we can't rely on mtime comparison
  // Instead, check the SWIG_VERSION define in the wrapper file
  try {
    const wrapperStat = fs.statSync(wrapperPath)
    
    // Wrapper should be at least 100KB (actual size is ~300KB)
    if (wrapperStat.size < 100000) {
      console.log('[navio-blsct] SWIG wrapper appears incomplete, regeneration required')
      return true
    }

    // Check for SWIG_VERSION define in first 1KB
    // Format: #define SWIG_VERSION 0x040401 (4.4.1 = 0x040401)
    const fd = fs.openSync(wrapperPath, 'r')
    const buffer = Buffer.alloc(1024)
    fs.readSync(fd, buffer, 0, 1024, 0)
    fs.closeSync(fd)
    const header = buffer.toString('utf8')

    // Look for SWIG_VERSION hex define
    const versionMatch = header.match(/#define SWIG_VERSION 0x([0-9a-fA-F]+)/)
    if (!versionMatch) {
      console.log('[navio-blsct] SWIG wrapper missing version info, regeneration required')
      return true
    }

    // Parse version: 0x040401 = major*0x10000 + minor*0x100 + patch
    const versionHex = parseInt(versionMatch[1], 16)
    const major = (versionHex >> 16) & 0xFF
    const minor = (versionHex >> 8) & 0xFF
    const patch = versionHex & 0xFF
    const versionStr = `${major}.${minor}.${patch}`

    // Require SWIG 4.1.0+ for Node.js 12-23 V8 compatibility
    const minVersion = 0x040100 // 4.1.0
    if (versionHex < minVersion) {
      console.log(`[navio-blsct] SWIG wrapper version ${versionStr} is too old, regeneration required`)
      return true
    }

    console.log(`[navio-blsct] Using existing SWIG wrapper (version ${versionStr})`)
    return false
  } catch (err) {
    console.log(`[navio-blsct] Error checking wrapper: ${err.message}, regeneration required`)
    return true
  }
}

const buildSwigWrapper = (cfg) => {
  // Check if we need to regenerate the wrapper
  if (!shouldRegenerateWrapper(cfg)) {
    console.log('[navio-blsct] Using existing SWIG wrapper (blsct_wrap.cxx)')
    return
  }

  // Only install/check SWIG if regeneration is needed
  if (!ensureSwigInstalled()) {
    console.error(
      `[navio-blsct] SWIG is required to regenerate the wrapper but could not be installed.\n` +
      `The pre-built wrapper requires SWIG 4.1.0+ for Node.js 20/22/23 compatibility.\n\n` +
      `Options:\n` +
      `  1. Install SWIG 4.1.0 or later manually\n` +
      `  2. Use the pre-built wrapper by ensuring blsct_wrap.cxx exists\n`
    )
    process.exit(1)
  }

  // Check SWIG version before regenerating
  const swigVersion = getSwigVersion()
  if (!swigVersion) {
    console.error(
      `[navio-blsct] SWIG is required to regenerate the wrapper but was not found.\n` +
      `The pre-built wrapper requires SWIG 4.1.0+ for Node.js 20/22/23 compatibility.\n\n` +
      `Options:\n` +
      `  1. Install SWIG 4.1.0 or later\n` +
      `  2. Use the pre-built wrapper by ensuring blsct_wrap.cxx exists\n`
    )
    process.exit(1)
  }

  // Require SWIG 4.1.0+ for Node.js 12-23 V8 compatibility
  const minMajor = 4, minMinor = 1
  if (swigVersion.major < minMajor || 
      (swigVersion.major === minMajor && swigVersion.minor < minMinor)) {
    console.error(
      `[navio-blsct] SWIG ${swigVersion.string} is too old for Node.js 20/22/23.\n` +
      `SWIG 4.1.0+ is required for V8 API compatibility.\n\n` +
      `Your options:\n` +
      `  1. Upgrade SWIG to 4.1.0 or later:\n` +
      `     - Ubuntu/Debian: Check if a newer version is available or build from source\n` +
      `     - macOS: brew install swig\n` +
      `     - From source: https://github.com/swig/swig\n\n`
    )
    process.exit(1)
  }

  console.log(`[navio-blsct] Building SWIG wrapper with SWIG ${swigVersion.string}...`)
  const res = spawnSync(
    'swig', ['-c++', '-javascript', '-node', 'blsct.i'],
    { cwd: cfg.swigDir, stdio: 'inherit' }
  )
  if (res.status !== 0) {
    throw new Error(`Failed to build swig wrapper: exit code ${res.status}`)
  }
}

// ============================================================================
// Main
// ============================================================================

const main = () => {
  console.log('=== Building navio-blsct native module ===\n')

  const cfg = getCfg()
  const numCpus = os.cpus().length

  // Install system dependencies
  if (isLinux()) {
    ensureLinuxAptDeps(LINUX_APT_PACKAGES)
  } else if (isDarwin()) {
    ensureMacOSDeps(MACOS_BREW_PACKAGES)
  } else {
    console.log(`Platform: ${process.platform} (no automatic dependency installation)`)
  }

  gitCloneNavioCore(cfg)

  if (process.env.BLSCT_PREBUILT_DIR) {
    usePrebuiltLibs(cfg, process.env.BLSCT_PREBUILT_DIR)
    buildSwigWrapper(cfg)
    console.log('\n=== Build complete! ===')
    return
  }

  // If cached .a files exist and contain the required symbols, reuse them.
  // Otherwise rebuild libblsct from the checked-out navio-core commit.
  const haveAllArchives = cfg.destDotAFiles.every(file => fs.existsSync(file))
  const cachedLibBlsctPath = cfg.destDotAFiles[0]
  const cacheMeta = readCacheMeta(cfg.libsCacheMetaPath)
  const cacheMetaMatches = cacheMeta !== null &&
    cacheMeta.cacheVersion === cfg.libsCacheVersion &&
    cacheMeta.navioCoreSha === cfg.navioCoreMasterSha
  const cachedLibsAreCompatible = archiveHasSymbols(
    cachedLibBlsctPath,
    cfg.requiredLibBlsctSymbols
  )

  if (haveAllArchives && cachedLibsAreCompatible && cacheMetaMatches) {
    const src_dest = cfg.srcDotAFiles.map((src, i) => [src, cfg.destDotAFiles[i]])
    for (const [src, dest] of src_dest) {
      console.log(`Copying ${dest} to ${src}...`)
      fs.copyFileSync(dest, src)
    }
  } else {
    if (haveAllArchives && (!cachedLibsAreCompatible || !cacheMetaMatches)) {
      console.log('[navio-blsct] Cached static libraries are stale or incompatible; rebuilding static libraries...')
    }
    buildLibBlsct(cfg, numCpus)
  }

  buildSwigWrapper(cfg)

  console.log('\n=== Build complete! ===')
}

main()
