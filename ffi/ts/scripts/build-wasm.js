#!/usr/bin/env node
/**
 * Build script for compiling libblsct to WebAssembly using Emscripten
 * 
 * Prerequisites:
 * - Emscripten SDK installed and activated (https://emscripten.org/docs/getting_started/downloads.html)
 * - Run `source /path/to/emsdk/emsdk_env.sh` before running this script
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readNavioCorePin } = require('./navio-core-pin');

// Configuration
const IS_PROD = true;
// Enable WASM assertions for debugging (set WASM_DEBUG=1 to enable)
const WASM_DEBUG = process.env.WASM_DEBUG === '1';

// Production: clone by specific SHA from nav-io/navio-core, the same commit
// build.js and every other binding use (ffi/navio-core.sha).
const MASTER_SHA = readNavioCorePin();
const NAVIO_CORE_REPO = IS_PROD
  ? 'https://github.com/nav-io/navio-core'
  : 'https://github.com/gogoex/navio-core';
const NAVIO_CORE_BRANCH = IS_PROD ? 'master' : 'development-branch-name'

const ROOT_DIR = path.resolve(__dirname, '..');
const NAVIO_CORE_DIR = path.resolve(ROOT_DIR, 'navio-core');
const WASM_OUTPUT_DIR = path.resolve(ROOT_DIR, 'wasm');
const BUILD_DIR = path.resolve(ROOT_DIR, 'build-wasm');
const PATCHES_DIR = path.resolve(__dirname, '..', 'patches');
// Single-threaded + entropy patch: the WASM module is built without pthreads
// (SharedArrayBuffer would require COOP/COEP headers on every consumer), so
// the std::thread / std::async fan-out in navio-core is compiled out under
// WASM_SINGLE_THREADED, and BlstScalar::Rand takes getentropy() (crypto
// .getRandomValues) instead of /dev/urandom, which FILESYSTEM=0 does not have.
const SINGLE_THREADED_PATCH = path.resolve(PATCHES_DIR, 'navio-core-single-threaded.patch');
const EM_CACHE_DIR = process.env.EM_CACHE || path.resolve(ROOT_DIR, '.emcache');

// Ensure output directories exist
if (!fs.existsSync(WASM_OUTPUT_DIR)) {
  fs.mkdirSync(WASM_OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}
if (!fs.existsSync(EM_CACHE_DIR)) {
  fs.mkdirSync(EM_CACHE_DIR, { recursive: true });
}
process.env.EM_CACHE = EM_CACHE_DIR;

/**
 * Get the current commit SHA of the navio-core checkout
 */
function getNavioCoreCommit() {
  try {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: NAVIO_CORE_DIR,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (result.status === 0) {
      return result.stdout.toString().trim();
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

/**
 * Clone navio-core repository if it doesn't exist or is at wrong commit
 */
function ensureNavioCore() {
  const srcDir = path.join(NAVIO_CORE_DIR, 'src');
  const requiredSha = IS_PROD ? MASTER_SHA : null;

  // Local-source bypass, as in build.js: build against an in-place navio-core
  // checkout (e.g. an unmerged branch) as-is. Without it, a checkout at any
  // other commit than the pin is deleted and re-cloned below.
  if (process.env.BLSCT_LOCAL_NAVIO_CORE === '1') {
    if (!fs.existsSync(srcDir)) {
      throw new Error(`BLSCT_LOCAL_NAVIO_CORE=1 but ${NAVIO_CORE_DIR} has no src/ directory`);
    }
    console.log(`Using existing local navio-core dir (BLSCT_LOCAL_NAVIO_CORE=1): ${NAVIO_CORE_DIR}`);
    return;
  }

  // Check if navio-core exists and is at the correct commit
  if (fs.existsSync(srcDir)) {
    const currentSha = getNavioCoreCommit();

    if (requiredSha && currentSha) {
      if (currentSha.startsWith(requiredSha) || requiredSha.startsWith(currentSha)) {
        console.log(`✓ navio-core already at correct commit ${requiredSha.slice(0, 12)}`);
        return;
      } else {
        console.log(`navio-core at commit ${currentSha.slice(0, 12)}, but need ${requiredSha.slice(0, 12)}`);
        console.log('Removing stale navio-core to re-clone...');
        fs.rmSync(NAVIO_CORE_DIR, { recursive: true, force: true });
      }
    } else if (!requiredSha) {
      console.log('✓ navio-core already exists (dev mode, no SHA check)');
      return;
    }
  }

  console.log('Cloning navio-core repository...');

  // Remove any partial clone
  if (fs.existsSync(NAVIO_CORE_DIR)) {
    fs.rmSync(NAVIO_CORE_DIR, { recursive: true, force: true });
  }

  console.log(`  Repository: ${NAVIO_CORE_REPO}`);

  const cloneCmd = ['git', 'clone', '--depth', '1'];
  if (NAVIO_CORE_BRANCH !== '') {
    cloneCmd.push('--branch', NAVIO_CORE_BRANCH);
    console.log(`  Branch: ${NAVIO_CORE_BRANCH}`);
  } else {
    console.log('  Using master branch');
  }
  cloneCmd.push(NAVIO_CORE_REPO, NAVIO_CORE_DIR);

  const result = spawnSync(cloneCmd[0], cloneCmd.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Failed to clone navio-core: exit code ${result.status}`);
  }

  console.log('✓ navio-core cloned successfully');

  // For production, checkout specific SHA
  if (requiredSha) {
    {
      const fetchCmd = ['git', 'fetch', '--depth', '1', 'origin', requiredSha];
      const fetchRes = spawnSync(fetchCmd[0], fetchCmd.slice(1), { cwd: NAVIO_CORE_DIR, stdio: 'inherit' });
      if (fetchRes.status !== 0) {
        throw new Error(`${fetchCmd.join(' ')} failed: exit code ${fetchRes.status}`);
      }
      console.log(`Fetched navio-core commit ${requiredSha}`);
    }
    {
      const checkoutCmd = ['git', 'checkout', requiredSha];
      const checkoutRes = spawnSync(checkoutCmd[0], checkoutCmd.slice(1), { cwd: NAVIO_CORE_DIR, stdio: 'inherit' });
      if (checkoutRes.status !== 0) {
        throw new Error(`${checkoutCmd.join(' ')} failed: exit code ${checkoutRes.status}`);
      }
      console.log(`Checked out navio-core commit ${requiredSha}`);
    }
  }
}

/**
 * Apply a single patch file to navio-core
 * Uses git apply with --check first to see if patch is needed
 */
function applyPatch(patchPath, label) {
  if (!fs.existsSync(patchPath)) {
    console.log(`⚠ ${label} patch not found, skipping...`);
    return;
  }

  // Check if patch is already applied (reverse check succeeds)
  const checkResult = spawnSync('git', ['apply', '--check', '--reverse', patchPath], {
    cwd: NAVIO_CORE_DIR,
    stdio: 'pipe',
  });

  if (checkResult.status === 0) {
    console.log(`✓ ${label} patch already applied`);
    return;
  }

  // Check if patch can be applied forward
  const canApplyResult = spawnSync('git', ['apply', '--check', patchPath], {
    cwd: NAVIO_CORE_DIR,
    stdio: 'pipe',
  });

  if (canApplyResult.status !== 0) {
    console.error(`⚠ ${label} patch cannot be applied cleanly`);
    console.error('  This may indicate the patch is partially applied or conflicts exist');
    console.error('  Stderr:', canApplyResult.stderr?.toString());
    throw new Error(`${label} patch application check failed`);
  }

  console.log(`Applying ${label} patch to navio-core...`);
  const applyResult = spawnSync('git', ['apply', patchPath], {
    cwd: NAVIO_CORE_DIR,
    stdio: 'inherit',
  });

  if (applyResult.status !== 0) {
    throw new Error(`Failed to apply ${label} patch: exit code ${applyResult.status}`);
  }

  console.log(`✓ ${label} patch applied successfully`);
}

/**
 * Apply all WASM-specific patches to navio-core
 */
function applyPatches() {
  applyPatch(SINGLE_THREADED_PATCH, 'Single-threaded');
}

// Check if emcc is available
function checkEmscripten() {
  try {
    execSync('emcc --version', { stdio: 'pipe' });
    console.log('✓ Emscripten found');
    return true;
  } catch {
    console.error('✗ Emscripten not found. Please install and activate emsdk:');
    console.error('  1. git clone https://github.com/emscripten-core/emsdk.git');
    console.error('  2. cd emsdk && ./emsdk install latest && ./emsdk activate latest');
    console.error('  3. source ./emsdk_env.sh');
    return false;
  }
}

// Source files needed for libblsct WASM build
const BLSCT_SOURCES = [
  'blsct/external_api/blsct.cpp',
  'blsct/external_api/blsct_clientversion.cpp',
  'blsct/arith/elements.cpp',
  'blsct/arith/blst/blst_g1point.cpp',
  'blsct/arith/blst/blst_scalar.cpp',
  'blsct/arith/blst/blst_util.cpp',
  'blsct/bech32_mod.cpp',
  'blsct/building_block/fixed_base_window.cpp',
  'blsct/building_block/g_h_gi_hi_zero_verifier.cpp',
  'blsct/building_block/generator_deriver.cpp',
  'blsct/building_block/imp_inner_prod_arg.cpp',
  'blsct/building_block/lazy_point.cpp',
  'blsct/building_block/lazy_points.cpp',
  'blsct/building_block/weighted_inner_prod_arg.cpp',
  'blsct/chain.cpp',
  'blsct/common.cpp',
  'blsct/double_public_key.cpp',
  'blsct/eip_2333/bls12_381_keygen.cpp',
  'blsct/key_io.cpp',
  'blsct/pos/helpers.cpp',
  'blsct/pos/pos.cpp',
  'blsct/pos/proof_logic.cpp',
  'blsct/pos/proof.cpp',
  'blsct/private_key.cpp',
  'blsct/public_key.cpp',
  'blsct/public_keys.cpp',
  'blsct/range_proof/common.cpp',
  'blsct/range_proof/generators.cpp',
  'blsct/range_proof/msg_amt_cipher.cpp',
  'blsct/range_proof/proof_base.cpp',
  'blsct/range_proof/bulletproofs/amount_recovery_request.cpp',
  'blsct/range_proof/bulletproofs/amount_recovery_result.cpp',
  'blsct/range_proof/bulletproofs/range_proof.cpp',
  'blsct/range_proof/bulletproofs/range_proof_logic.cpp',
  'blsct/range_proof/bulletproofs/range_proof_with_transcript.cpp',
  'blsct/range_proof/bulletproofs_plus/amount_recovery_request.cpp',
  'blsct/range_proof/bulletproofs_plus/amount_recovery_result.cpp',
  'blsct/range_proof/bulletproofs_plus/fixed_base_cache.cpp',
  'blsct/range_proof/bulletproofs_plus/range_proof.cpp',
  'blsct/range_proof/bulletproofs_plus/range_proof_logic.cpp',
  'blsct/range_proof/bulletproofs_plus/range_proof_with_transcript.cpp',
  'blsct/range_proof/bulletproofs_plus/util.cpp',
  'blsct/set_mem_proof/set_mem_proof_prover.cpp',
  'blsct/set_mem_proof/set_mem_proof_setup.cpp',
  'blsct/set_mem_proof/set_mem_proof.cpp',
  'blsct/signature.cpp',
  'blsct/tokens/info.cpp',
  'blsct/tokens/predicate_exec.cpp',
  'blsct/tokens/predicate_parser.cpp',
  'blsct/wallet/address.cpp',
  'blsct/wallet/delegation.cpp',
  'blsct/wallet/helpers.cpp',
  'blsct/wallet/keyman.cpp',
  'blsct/wallet/keyring.cpp',
  'blsct/wallet/txfactory_base.cpp',
  'blsct/wallet/txfactory_global.cpp',
  'blsct/wallet/txfactory.cpp',
  'blsct/wallet/unsigned_transaction.cpp',
  'blsct/wallet/verification.cpp',
];

// Additional source files needed from navio-core
const UTIL_SOURCES = [
  'crypto/chacha20.cpp',
  'crypto/chacha20poly1305.cpp',
  'crypto/poly1305.cpp',
  'crypto/hmac_sha256.cpp',
  'crypto/hmac_sha512.cpp',
  'crypto/ripemd160.cpp',
  'crypto/sha256.cpp',
  'crypto/sha512.cpp',
  'hash.cpp',
  'primitives/transaction.cpp',
  'script/interpreter.cpp',
  'script/script.cpp',
  'script/script_error.cpp',
  'support/cleanse.cpp',
  'support/lockedpool.cpp',
  'uint256.cpp',
  'util/strencodings.cpp',
];

// Exported functions for the WASM module
// These match the functions exported in ffi/ts/swig/blsct.i (from gogoex/navio-core fork)
const EXPORTED_FUNCTIONS = [
  // Memory management
  '_init',
  '_free_obj',
  '_free_amounts_ret_val',

  // Chain configuration
  '_get_blsct_chain',
  '_set_blsct_chain',

  // Scalar operations
  '_gen_random_scalar',
  '_gen_scalar',
  '_scalar_to_uint64',
  '_are_scalar_equal',
  '_scalar_to_pub_key',
  '_scalar_to_str',
  '_serialize_scalar',
  '_deserialize_scalar',

  // Point operations
  '_gen_random_point',
  '_gen_base_point',
  '_is_valid_point',
  '_are_point_equal',
  '_point_from_scalar',
  '_point_to_str',
  '_scalar_muliply_point',
  '_serialize_point',
  '_deserialize_point',

  // Public key operations
  '_gen_random_public_key',
  '_get_public_key_point',
  '_point_to_public_key',

  // Double public key operations
  '_gen_double_pub_key',
  '_gen_dpk_with_keys_acct_addr',
  '_dpk_to_sub_addr',
  '_serialize_dpk',
  '_deserialize_dpk',

  // Address operations
  '_encode_address',
  '_decode_address',

  // Token ID operations
  '_gen_token_id',
  '_gen_token_id_with_token_and_subid',
  '_gen_default_token_id',
  '_get_token_id_token',
  '_get_token_id_subid',
  '_serialize_token_id',
  '_deserialize_token_id',

  // Generic string map helpers
  '_create_string_map',
  '_add_to_string_map',
  '_delete_string_map',
  '_get_string_map_size',
  '_get_string_map_key_at',
  '_get_string_map_value_at',

  // Token info helpers
  '_build_token_info',
  '_delete_token_info',
  '_serialize_token_info',
  '_deserialize_token_info',
  '_get_token_info_type',
  '_get_token_info_public_key',
  '_get_token_info_total_supply',
  '_get_token_info_metadata',

  // Collection token hash and key derivation
  '_calc_collection_token_hash',
  '_derive_collection_token_key',
  '_derive_collection_token_public_key',

  // Sub address operations
  '_gen_sub_addr_id',
  '_get_sub_addr_id_account',
  '_get_sub_addr_id_address',
  '_derive_sub_address',
  '_sub_addr_to_dpk',
  '_serialize_sub_addr',
  '_deserialize_sub_addr',
  '_serialize_sub_addr_id',
  '_deserialize_sub_addr_id',

  // Range proof operations
  '_create_range_proof_vec',
  '_add_to_range_proof_vec',
  '_delete_range_proof_vec',
  '_build_range_proof',
  '_verify_range_proofs',
  '_serialize_range_proof',
  '_deserialize_range_proof',
  '_get_range_proof_A',
  '_get_range_proof_A_wip',
  '_get_range_proof_B',
  '_get_range_proof_r_prime',
  '_get_range_proof_s_prime',
  '_get_range_proof_delta_prime',
  '_get_range_proof_alpha_hat',
  '_get_range_proof_tau_x',

  // Amount recovery
  '_gen_amount_recovery_req',
  '_create_amount_recovery_req_vec',
  '_add_to_amount_recovery_req_vec',
  '_delete_amount_recovery_req_vec',
  '_recover_amount',
  '_get_amount_recovery_result_size',
  '_get_amount_recovery_result_is_succ',
  '_get_amount_recovery_result_amount',
  '_get_amount_recovery_result_gamma',
  '_get_amount_recovery_result_msg',

  // Out point operations
  '_gen_out_point',
  '_serialize_out_point',
  '_deserialize_out_point',

  // Transaction building
  '_create_tx_in_vec',
  '_add_to_tx_in_vec',
  '_delete_tx_in_vec',
  '_create_tx_out_vec',
  '_add_to_tx_out_vec',
  '_delete_tx_out_vec',
  '_set_tx_out_transcript_v2',
  '_get_tx_out_transcript_v2',
  '_build_tx_in',
  '_build_tx_out',
  '_build_ctx',
  '_build_ctx_with_change',
  '_get_ctx_id',
  '_get_ctx_ins',
  '_get_ctx_outs',
  '_serialize_ctx',
  '_deserialize_ctx',
  '_delete_ctx',

  // CTx ID
  '_serialize_ctx_id',
  '_deserialize_ctx_id',
  '_create_tx_hex_vec',
  '_add_to_tx_hex_vec',
  '_delete_tx_hex_vec',
  '_aggregate_transactions',

  // CTxIns accessors
  '_get_ctx_ins_size',
  '_get_ctx_in_at',

  // CTxIn accessors
  '_get_ctx_in_prev_out_hash',
  '_get_ctx_in_script_sig',
  '_get_ctx_in_sequence',
  '_get_ctx_in_script_witness',

  // CTxOuts accessors
  '_get_ctx_outs_size',
  '_get_ctx_out_at',

  // CTxOut accessors
  '_get_ctx_out_value',
  '_get_ctx_out_script_pub_key',
  '_get_ctx_out_token_id',
  '_get_ctx_out_vector_predicate',
  '_get_ctx_out_spending_key',
  '_get_ctx_out_ephemeral_key',
  '_get_ctx_out_blinding_key',
  '_get_ctx_out_range_proof',
  '_get_ctx_out_view_tag',

  // Predicate helpers
  '_are_vector_predicate_equal',
  '_serialize_vector_predicate',
  '_deserialize_vector_predicate',
  '_get_vector_predicate_type',
  '_build_create_token_predicate',
  '_build_mint_token_predicate',
  '_build_mint_nft_predicate',
  '_get_create_token_predicate_token_info',
  '_get_mint_token_predicate_public_key',
  '_get_mint_token_predicate_amount',
  '_get_mint_nft_predicate_public_key',
  '_get_mint_nft_predicate_nft_id',
  '_get_mint_nft_predicate_metadata',

  // TxIn accessors
  '_get_tx_in_amount',
  '_get_tx_in_gamma',
  '_get_tx_in_spending_key',
  '_get_tx_in_token_id',
  '_get_tx_in_out_point',
  '_get_tx_in_staked_commitment',
  '_get_tx_in_rbf',

  // TxOut accessors
  '_get_tx_out_destination',
  '_get_tx_out_amount',
  '_get_tx_out_memo',
  '_get_tx_out_token_id',
  '_get_tx_out_output_type',
  '_get_tx_out_min_stake',
  '_get_tx_out_subtract_fee_from_amount',
  '_get_tx_out_blinding_key',

  // Unsigned input/output/transaction helpers
  '_build_unsigned_input',
  '_delete_unsigned_input',
  '_serialize_unsigned_input',
  '_deserialize_unsigned_input',
  '_build_unsigned_output',
  '_build_unsigned_create_token_output',
  '_build_unsigned_mint_token_output',
  '_build_unsigned_mint_token_output_with_transcript',
  '_build_unsigned_mint_nft_output',
  '_delete_unsigned_output',
  '_serialize_unsigned_output',
  '_deserialize_unsigned_output',
  '_create_unsigned_transaction',
  '_add_unsigned_transaction_input',
  '_add_unsigned_transaction_output',
  '_set_unsigned_transaction_fee',
  '_get_unsigned_transaction_fee',
  '_get_unsigned_transaction_inputs_size',
  '_get_unsigned_transaction_outputs_size',
  '_delete_unsigned_transaction',
  '_serialize_unsigned_transaction',
  '_deserialize_unsigned_transaction',
  '_sign_unsigned_transaction',

  // Signature operations
  '_sign_message',
  '_verify_msg_sig',
  '_serialize_signature',
  '_deserialize_signature',

  // Script operations
  '_serialize_script',
  '_deserialize_script',

  // Key derivation
  '_from_seed_to_child_key',
  '_from_child_key_to_blinding_key',
  '_from_child_key_to_token_key',
  '_from_child_key_to_tx_key',
  '_from_tx_key_to_view_key',
  '_from_tx_key_to_spending_key',
  '_calc_priv_spending_key',

  // Key ID / Hash ID
  '_calc_key_id',
  '_serialize_key_id',
  '_deserialize_key_id',

  // Helper functions
  '_calc_view_tag',
  '_calc_nonce',

  // Misc utilities
  '_hex_to_malloced_buf',
  '_buf_to_malloced_hex_c_str',
  '_create_uint64_vec',
  '_add_to_uint64_vec',
  '_delete_uint64_vec',

  // Standard allocators
  '_malloc',
  '_free',
];

const EXPORTED_RUNTIME_METHODS = [
  'ccall',
  'cwrap',
  'getValue',
  'setValue',
  'UTF8ToString',
  'stringToUTF8',
  'lengthBytesUTF8',
  'stackSave',
  'stackRestore',
  'stackAlloc',
  'HEAPU8',   // Needed for cryptoGetRandomValues
  'HEAPU32',  // Needed for memory parsing (parseRetVal)
  'HEAP32',   // Used in some memory operations
];

function buildBlst() {
  // supranational/blst is vendored in navio-core (src/blst). wasm32 has no
  // assembly back end, so build its portable C implementation (32-bit limbs,
  // vect.h selects them under __BLST_NO_ASM__) from the single translation
  // unit server.c — the same thing navio-core's cmake/blst.cmake does for
  // non-x86_64/arm64 targets.
  //
  // No -flto here, on purpose: blst.h declares its predicates as `bool`
  // (blst_p1_is_inf, blst_p1_on_curve, ...) while the C definitions return
  // `int`. Native ABIs do not care, but with both sides in LTO LLVM sees the
  // `i1` vs `i32` prototype mismatch and replaces every such call with an
  // `unreachable` trap (".Lblst_p1_is_inf_bitcast_invalid"), which fires the
  // first time init() derives a generator. Linking blst as a plain wasm
  // object keeps the comparison at the wasm-signature level, where both are
  // (i32) -> i32.
  console.log('Building blst library for WASM...');
  const blstDir = path.join(NAVIO_CORE_DIR, 'src/blst');

  const blstBuildCmd = [
    'emcc',
    '-O2',
    '-fno-builtin',
    '-fno-stack-protector',
    '-DNDEBUG',
    '-D__BLST_NO_ASM__',
    `-I${blstDir}/bindings`,
    '-c',
    `${blstDir}/src/server.c`,
    '-o', `${BUILD_DIR}/blst.o`
  ].join(' ');

  execSync(blstBuildCmd, { stdio: 'inherit', cwd: BUILD_DIR });
  console.log('✓ blst built');
}

function setupConfigHeader() {
  // Copy wasm-config.h to navio-core/src as bitcoin-config.h
  const configSrc = path.join(__dirname, 'wasm-config.h');
  const configDest = path.join(NAVIO_CORE_DIR, 'src/config/bitcoin-config.h');

  // Ensure config directory exists
  const configDir = path.dirname(configDest);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.copyFileSync(configSrc, configDest);
  console.log('✓ Config header installed');
}

function buildBlsct() {
  console.log('Building libblsct for WASM...');
  const srcDir = path.join(NAVIO_CORE_DIR, 'src');
  const blstDir = path.join(srcDir, 'blst');

  // Include boost stubs for WASM builds (avoids needing real Boost installation)
  const boostStubsDir = path.join(__dirname, 'boost-stubs');

  const includeFlags = [
    `-I${boostStubsDir}`,
    `-I${srcDir}`,
    `-I${srcDir}/config`,
    `-I${blstDir}/bindings`,
    `-I${srcDir}/univalue/include`,
  ].join(' ');

  const compilerFlags = [
    '-O3',
    '-flto',
    '-fno-rtti',
    '-fno-threadsafe-statics',
    '-fno-stack-protector',
    '-DHAVE_CONFIG_H',
    '-DLIBBLSCT',
    '-DWASM_SINGLE_THREADED',
    '-std=c++20',
  ].join(' ');

  // Compile each source file
  const objectFiles = [];
  const missingFiles = [];
  const failedFiles = [];

  // Compile all sources (BLSCT + utilities)
  const allSources = [...BLSCT_SOURCES, ...UTIL_SOURCES];

  for (const source of allSources) {
    const sourcePath = path.join(srcDir, source);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`  Warning: Source file not found: ${source}`);
      missingFiles.push(source);
      continue;
    }

    const objName = source.replace(/\//g, '_').replace('.cpp', '.o');
    const objPath = path.join(BUILD_DIR, objName);

    console.log(`  Compiling ${source}...`);
    const cmd = `emcc ${compilerFlags} ${includeFlags} -c ${sourcePath} -o ${objPath}`;

    try {
      execSync(cmd, { stdio: 'pipe', cwd: BUILD_DIR });
      objectFiles.push(objPath);
    } catch (err) {
      console.error(`  Error compiling ${source}:`, err.stderr?.toString() || err.message);
      failedFiles.push(source);
    }
  }

  // Report summary of missing and failed files
  if (missingFiles.length > 0 || failedFiles.length > 0) {
    console.log('\n=== Compilation Summary ===');

    if (missingFiles.length > 0) {
      console.error(`\nMissing source files (${missingFiles.length}):`);
      missingFiles.forEach(file => console.error(`  - ${file}`));
    }

    if (failedFiles.length > 0) {
      console.error(`\nFailed to compile (${failedFiles.length}):`);
      failedFiles.forEach(file => console.error(`  - ${file}`));
    }

    console.log();

    // Exit with error if there are compilation failures
    if (failedFiles.length > 0) {
      throw new Error(`Build failed: ${failedFiles.length} file(s) failed to compile`);
    }
  }

  return objectFiles;
}

function linkWasm(objectFiles) {
  console.log('Linking WASM module...');

  if (WASM_DEBUG) {
    console.log('DEBUG MODE: Building with assertions enabled (-sASSERTIONS=2)');
  }

  const linkFlags = [
    WASM_DEBUG ? '-O0' : '-O3',
    '-flto',
    '-s', 'WASM=1',
    '-s', 'WASM_BIGINT=1',
    '-s', 'MODULARIZE=1',
    '-s', 'EXPORT_NAME="BlsctModule"',
    '-s', `EXPORTED_FUNCTIONS='${JSON.stringify(EXPORTED_FUNCTIONS)}'`,
    '-s', `EXPORTED_RUNTIME_METHODS='${JSON.stringify(EXPORTED_RUNTIME_METHODS)}'`,
    '-s', 'ALLOW_MEMORY_GROWTH=1',
    '-s', 'INITIAL_MEMORY=16777216',
    '-s', 'MAXIMUM_MEMORY=1073741824',
    '-s', 'STACK_SIZE=1048576',
    '-s', 'ENVIRONMENT=web,worker,node',
    '-s', 'FILESYSTEM=0',
    '-s', 'SINGLE_FILE=0',
    '-s', 'DISABLE_EXCEPTION_CATCHING=0',
    '-s', 'ABORTING_MALLOC=0',
    '--no-entry',
    ...(WASM_DEBUG ? ['-s', 'ASSERTIONS=2', '-s', 'SAFE_HEAP=1', '-s', 'STACK_OVERFLOW_CHECK=2'] : []),
  ].join(' ');

  const allObjects = [
    ...objectFiles,
    `${BUILD_DIR}/blst.o`,
  ].join(' ');

  const outputJs = path.join(WASM_OUTPUT_DIR, 'blsct.js');
  const cmd = `emcc ${linkFlags} ${allObjects} -o ${outputJs}`;

  execSync(cmd, { stdio: 'inherit', cwd: BUILD_DIR });
  console.log(`✓ WASM module created: ${outputJs}`);
}

async function main() {
  console.log('=== Building libblsct for WebAssembly ===\n');

  if (!checkEmscripten()) {
    process.exit(1);
  }

  console.log(`\nNavio Core directory: ${NAVIO_CORE_DIR}`);
  console.log(`WASM output directory: ${WASM_OUTPUT_DIR}`);
  console.log(`Build directory: ${BUILD_DIR}`);
  console.log(`Debug mode: ${WASM_DEBUG ? 'ENABLED (assertions on)' : 'disabled'}\n`);

  try {
    // Ensure navio-core is available
    ensureNavioCore();

    // Apply WASM-specific patches (single-threaded range proof verification)
    applyPatches();

    // Install WASM-specific config header
    setupConfigHeader();

    buildBlst();
    const objectFiles = buildBlsct();

    if (objectFiles.length === 0) {
      console.error('No object files were compiled. Check the source paths.');
      process.exit(1);
    }

    linkWasm(objectFiles);

    console.log('\n=== Build complete! ===');
    console.log(`WASM files are in: ${WASM_OUTPUT_DIR}`);
  } catch (err) {
    console.error('\nBuild failed:', err.message);
    process.exit(1);
  }
}

main();
