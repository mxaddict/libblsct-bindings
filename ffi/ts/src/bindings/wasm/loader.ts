/**
 * WebAssembly module loader for blsct
 * 
 * This module handles loading and initializing the WASM binary
 * in both browser and web worker environments.
 * 
 * For browser/bundler usage, the loader automatically resolves WASM paths
 * relative to this file using import.meta.url for compatibility with
 * bundlers like Vite, Webpack, and Rollup.
 */

export interface BlsctWasmModule {
  // Memory management
  _malloc(size: number): number;
  _free(ptr: number): void;
  _init(): void;
  _free_obj(ptr: number): void;
  _free_amounts_ret_val(ptr: number): void;
  
  // Scalar operations
  _gen_random_scalar(): number;
  _gen_scalar(n: bigint): number;
  _scalar_to_uint64(ptr: number): bigint;
  _scalar_to_str(ptr: number): number;
  _serialize_scalar(ptr: number): number;
  _deserialize_scalar(hex: number): number;
  _are_scalar_equal(a: number, b: number): number;
  _scalar_to_pub_key(scalar: number): number;
  
  // Point operations
  _gen_random_point(): number;
  _gen_base_point(): number;
  _point_to_str(ptr: number): number;
  _serialize_point(ptr: number): number;
  _deserialize_point(hex: number): number;
  _is_valid_point(ptr: number): number;
  _point_from_scalar(scalar: number): number;
  _are_point_equal(a: number, b: number): number;
  _scalar_muliply_point(point: number, scalar: number): number;
  
  // Public key operations
  _gen_random_public_key(): number;
  _get_public_key_point(pk: number): number;
  _point_to_public_key(point: number): number;
  
  // Double public key operations
  _gen_double_pub_key(pk1: number, pk2: number): number;
  _gen_dpk_with_keys_acct_addr(viewKey: number, spendingPubKey: number, account: bigint, address: bigint): number;
  _dpk_to_sub_addr(dpk: number): number;
  _serialize_dpk(ptr: number): number;
  _deserialize_dpk(hex: number): number;
  
  // Address operations
  _encode_address(dpk: number, encoding: number): number;
  _decode_address(addrStr: number): number;
  
  // Token ID operations
  _gen_token_id(token: bigint): number;
  _gen_token_id_with_token_and_subid(token: bigint, subid: bigint): number;
  _gen_default_token_id(): number;
  _get_token_id_token(tokenId: number): bigint;
  _get_token_id_subid(tokenId: number): bigint;
  _serialize_token_id(ptr: number): number;
  _deserialize_token_id(hex: number): number;

  // Generic string map helpers
  _create_string_map(): number;
  _add_to_string_map(stringMap: number, key: number, value: number): void;
  _delete_string_map(stringMap: number): void;
  _get_string_map_size(stringMap: number): number;
  _get_string_map_key_at(stringMap: number, index: number): number;
  _get_string_map_value_at(stringMap: number, index: number): number;

  // Token info helpers
  _build_token_info(type: number, publicKey: number, metadata: number, totalSupply: bigint): number;
  _delete_token_info(tokenInfo: number): void;
  _serialize_token_info(tokenInfo: number): number;
  _deserialize_token_info(hex: number): number;
  _get_token_info_type(tokenInfo: number): number;
  _get_token_info_public_key(tokenInfo: number): number;
  _get_token_info_total_supply(tokenInfo: number): bigint;
  _get_token_info_metadata(tokenInfo: number): number;

  // Collection token hash and token key derivation
  _calc_collection_token_hash(metadata: number, totalSupply: bigint): number;
  _derive_collection_token_key(masterTokenKey: number, collectionTokenHash: number): number;
  _derive_collection_token_public_key(masterTokenKey: number, collectionTokenHash: number): number;
  
  // Sub address operations
  _gen_sub_addr_id(account: bigint, address: bigint): number;
  _get_sub_addr_id_account(subAddrId: number): bigint;
  _get_sub_addr_id_address(subAddrId: number): bigint;
  _derive_sub_address(viewKey: number, spendingPubKey: number, subAddrId: number): number;
  _sub_addr_to_dpk(subAddr: number): number;
  _serialize_sub_addr(ptr: number): number;
  _deserialize_sub_addr(hex: number): number;
  _serialize_sub_addr_id(ptr: number): number;
  _deserialize_sub_addr_id(hex: number): number;
  
  // Range proof operations
  _create_range_proof_vec(): number;
  _add_to_range_proof_vec(vec: number, rangeProof: number, size: number): void;
  _delete_range_proof_vec(vec: number): void;
  _build_range_proof(amounts: number, nonce: number, msg: number, tokenId: number): number;
  _verify_range_proofs(proofs: number): number;
  _serialize_range_proof(ptr: number, size: number): number;
  _deserialize_range_proof(hex: number, size: number): number;
  _get_range_proof_A(ptr: number, size: number): number;
  _get_range_proof_A_wip(ptr: number, size: number): number;
  _get_range_proof_B(ptr: number, size: number): number;
  _get_range_proof_r_prime(ptr: number, size: number): number;
  _get_range_proof_s_prime(ptr: number, size: number): number;
  _get_range_proof_delta_prime(ptr: number, size: number): number;
  _get_range_proof_alpha_hat(ptr: number, size: number): number;
  _get_range_proof_tau_x(ptr: number, size: number): number;
  
  // Amount recovery operations
  _gen_amount_recovery_req(rangeProof: number, rangeProofSize: number, nonce: number, tokenId: number): number;
  _create_amount_recovery_req_vec(): number;
  _add_to_amount_recovery_req_vec(vec: number, req: number): void;
  _delete_amount_recovery_req_vec(vec: number): void;
  _recover_amount(vec: number): number;
  _get_amount_recovery_result_size(vec: number): number;
  _get_amount_recovery_result_is_succ(vec: number, i: number): boolean;
  _get_amount_recovery_result_amount(vec: number, i: number): bigint;
  _get_amount_recovery_result_gamma(vec: number, i: number): number;
  _get_amount_recovery_result_msg(vec: number, i: number): number;
  
  // Out point operations
  _gen_out_point(ctxId: number): number;
  _serialize_out_point(ptr: number): number;
  _deserialize_out_point(hex: number): number;
  
  // Transaction building
  _create_tx_in_vec(): number;
  _add_to_tx_in_vec(vec: number, txIn: number): void;
  _delete_tx_in_vec(vec: number): void;
  _create_tx_out_vec(): number;
  _add_to_tx_out_vec(vec: number, txOut: number): void;
  _delete_tx_out_vec(vec: number): void;
  _set_tx_out_transcript_v2(txOut: number, transcriptV2: number): void;
  _get_tx_out_transcript_v2(txOut: number): number;
  _build_tx_in(amount: bigint, gamma: number, spendingKey: number, tokenId: number, outPoint: number, stakedCommitment: boolean, rbf: boolean): number;
  _build_tx_out(dest: number, amount: bigint, memo: number, memoLen: number, tokenId: number, outputType: number, minStake: bigint, subtractFeeFromAmount: boolean, blindingKey: number): number;
  _build_ctx(txIns: number, txOuts: number): number;
  _build_ctx_with_change(txIns: number, txOuts: number, changeAddr: number): number;
  _get_ctx_id(ctx: number): number;
  _get_ctx_ins(ctx: number): number;
  _get_ctx_outs(ctx: number): number;
  _serialize_ctx(ctx: number): number;
  _deserialize_ctx(hex: number): number;
  _serialize_ctx_id(ctxId: number): number;
  _deserialize_ctx_id(hex: number): number;
  _create_tx_hex_vec(): number;
  _add_to_tx_hex_vec(txHexVec: number, txHex: number): void;
  _delete_tx_hex_vec(txHexVec: number): void;
  _aggregate_transactions(txHexVec: number): number;
  _delete_ctx(ctx: number): void;
  
  // CTxIns accessors
  _get_ctx_ins_size(ctxIns: number): number;
  _get_ctx_in_at(ctxIns: number, i: number): number;
  
  // CTxIn accessors
  _get_ctx_in_prev_out_hash(ctxIn: number): number;
  _get_ctx_in_script_sig(ctxIn: number): number;
  _get_ctx_in_sequence(ctxIn: number): number;
  _get_ctx_in_script_witness(ctxIn: number): number;
  
  // CTxOuts accessors
  _get_ctx_outs_size(ctxOuts: number): number;
  _get_ctx_out_at(ctxOuts: number, i: number): number;
  
  // CTxOut accessors
  _get_ctx_out_value(ctxOut: number): bigint;
  _get_ctx_out_script_pub_key(ctxOut: number): number;
  _get_ctx_out_token_id(ctxOut: number): number;
  _get_ctx_out_vector_predicate(ctxOut: number): number;
  _get_ctx_out_spending_key(ctxOut: number): number;
  _get_ctx_out_ephemeral_key(ctxOut: number): number;
  _get_ctx_out_blinding_key(ctxOut: number): number;
  _get_ctx_out_range_proof(ctxOut: number): number;
  _get_ctx_out_view_tag(ctxOut: number): number;

  // Predicate helpers
  _are_vector_predicate_equal(a: number, aSize: number, b: number, bSize: number): number;
  _serialize_vector_predicate(predicate: number, objSize: number): number;
  _deserialize_vector_predicate(hex: number): number;
  _get_vector_predicate_type(predicate: number, objSize: number): number;
  _build_create_token_predicate(tokenInfo: number): number;
  _build_mint_token_predicate(tokenPublicKey: number, amount: bigint): number;
  _build_mint_nft_predicate(tokenPublicKey: number, nftId: bigint, metadata: number): number;
  _get_create_token_predicate_token_info(predicate: number, objSize: number): number;
  _get_mint_token_predicate_public_key(predicate: number, objSize: number): number;
  _get_mint_token_predicate_amount(predicate: number, objSize: number): bigint;
  _get_mint_nft_predicate_public_key(predicate: number, objSize: number): number;
  _get_mint_nft_predicate_nft_id(predicate: number, objSize: number): bigint;
  _get_mint_nft_predicate_metadata(predicate: number, objSize: number): number;
  
  // TxIn accessors
  _get_tx_in_amount(txIn: number): bigint;
  _get_tx_in_gamma(txIn: number): number;
  _get_tx_in_spending_key(txIn: number): number;
  _get_tx_in_token_id(txIn: number): number;
  _get_tx_in_out_point(txIn: number): number;
  _get_tx_in_staked_commitment(txIn: number): boolean;
  _get_tx_in_rbf(txIn: number): boolean;
  
  // TxOut accessors
  _get_tx_out_destination(txOut: number): number;
  _get_tx_out_amount(txOut: number): bigint;
  _get_tx_out_memo(txOut: number): number;
  _get_tx_out_token_id(txOut: number): number;
  _get_tx_out_output_type(txOut: number): number;
  _get_tx_out_min_stake(txOut: number): bigint;
  _get_tx_out_subtract_fee_from_amount(txOut: number): boolean;
  _get_tx_out_blinding_key(txOut: number): number;

  // Unsigned input/output/transaction helpers
  _build_unsigned_input(txIn: number): number;
  _delete_unsigned_input(unsignedInput: number): void;
  _serialize_unsigned_input(unsignedInput: number): number;
  _deserialize_unsigned_input(hex: number): number;
  _build_unsigned_output(txOut: number): number;
  _build_unsigned_create_token_output(tokenKey: number, tokenInfo: number): number;
  _build_unsigned_mint_token_output(dest: number, amount: bigint, blindingKey: number, tokenKey: number, tokenPublicKey: number): number;
  _build_unsigned_mint_token_output_with_transcript(dest: number, amount: bigint, blindingKey: number, tokenKey: number, tokenPublicKey: number, transcriptV2: number): number;
  _build_unsigned_mint_nft_output(dest: number, blindingKey: number, tokenKey: number, tokenPublicKey: number, nftId: bigint, metadata: number): number;
  _delete_unsigned_output(unsignedOutput: number): void;
  _serialize_unsigned_output(unsignedOutput: number): number;
  _deserialize_unsigned_output(hex: number): number;
  _create_unsigned_transaction(): number;
  _add_unsigned_transaction_input(unsignedTx: number, unsignedInput: number): void;
  _add_unsigned_transaction_output(unsignedTx: number, unsignedOutput: number): void;
  _set_unsigned_transaction_fee(unsignedTx: number, fee: bigint): void;
  _get_unsigned_transaction_fee(unsignedTx: number): bigint;
  _get_unsigned_transaction_inputs_size(unsignedTx: number): number;
  _get_unsigned_transaction_outputs_size(unsignedTx: number): number;
  _delete_unsigned_transaction(unsignedTx: number): void;
  _serialize_unsigned_transaction(unsignedTx: number): number;
  _deserialize_unsigned_transaction(hex: number): number;
  _sign_unsigned_transaction(unsignedTx: number): number;
  
  // Signature operations
  _sign_message(privKey: number, msg: number): number;
  _verify_msg_sig(pubKey: number, msg: number, signature: number): boolean;
  _serialize_signature(ptr: number): number;
  _deserialize_signature(hex: number): number;
  
  // Script operations
  _serialize_script(ptr: number): number;
  _deserialize_script(hex: number): number;
  
  // Key derivation
  _from_seed_to_child_key(seed: number): number;
  _from_child_key_to_blinding_key(childKey: number): number;
  _from_child_key_to_token_key(childKey: number): number;
  _from_child_key_to_tx_key(childKey: number): number;
  _from_tx_key_to_view_key(txKey: number): number;
  _from_tx_key_to_spending_key(txKey: number): number;
  _calc_priv_spending_key(blindingPubKey: number, viewKey: number, spendingKey: number, account: bigint, address: bigint): number;
  
  // Key ID / Hash ID
  _calc_key_id(blindingPubKey: number, spendingPubKey: number, viewKey: number): number;
  _serialize_key_id(keyId: number): number;
  _deserialize_key_id(hex: number): number;
  
  // Helper functions
  _calc_view_tag(blindingPubKey: number, viewKey: number): bigint;
  _calc_nonce(blindingPubKey: number, viewKey: number): number;
  
  // Misc utilities
  _hex_to_malloced_buf(hex: number): number;
  _buf_to_malloced_hex_c_str(buf: number, size: number): number;
  _create_uint64_vec(): number;
  _add_to_uint64_vec(vec: number, n: bigint): void;
  _delete_uint64_vec(vec: number): void;
  
  // Chain configuration
  _get_blsct_chain(): number;
  _set_blsct_chain(chain: number): void;
  
  // Emscripten runtime methods
  ccall: (name: string, returnType: string | null, argTypes: string[], args: unknown[]) => unknown;
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: unknown[]) => unknown;
  getValue: (ptr: number, type: string) => number;
  setValue: (ptr: number, value: number, type: string) => void;
  UTF8ToString: (ptr: number) => string;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
  lengthBytesUTF8: (str: string) => number;
  stackSave: () => number;
  stackRestore: (ptr: number) => void;
  stackAlloc: (size: number) => number;
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  HEAPU32: Uint32Array;
}

export interface BlsctModuleFactory {
  (config?: Partial<BlsctModuleConfig>): Promise<BlsctWasmModule>;
}

export interface BlsctModuleConfig {
  locateFile?: (path: string, prefix: string) => string;
  wasmBinary?: ArrayBuffer;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}

let moduleInstance: BlsctWasmModule | null = null;
let modulePromise: Promise<BlsctWasmModule> | null = null;

/**
 * Add cryptoGetRandomValues to a module instance if not already present.
 * MCL_USE_WEB_CRYPTO_API requires Module.cryptoGetRandomValues for random number generation.
 * The MCL library calls: EM_ASM({Module.cryptoGetRandomValues($0, $1)}, buf, byteSize)
 */
function ensureCryptoGetRandomValues(instance: BlsctWasmModule): void {
  const instanceWithCrypto = instance as unknown as { 
    cryptoGetRandomValues?: (bufPtr: number, byteSize: number) => void 
  };
  
  if (!instanceWithCrypto.cryptoGetRandomValues && typeof crypto !== 'undefined' && crypto.getRandomValues) {
    instanceWithCrypto.cryptoGetRandomValues = (bufPtr: number, byteSize: number) => {
      const buffer = instance.HEAPU8.subarray(bufPtr, bufPtr + byteSize);
      crypto.getRandomValues(buffer);
    };
  }
}

/**
 * Options for loading the BLSCT WASM module
 */
export interface LoadBlsctModuleOptions {
  /**
   * Custom path to the WASM JS loader file.
   * If not provided, the path is automatically resolved relative to this loader file.
   */
  wasmPath?: string;
  /**
   * Pre-loaded WASM binary as ArrayBuffer.
   * When provided, the loader skips fetching the .wasm file and uses this binary directly.
   * Useful for environments where you want to bundle or inline the WASM binary.
   */
  wasmBinary?: ArrayBuffer;
}

/**
 * Calculate the default WASM path relative to this loader file.
 * Uses import.meta.url for bundler compatibility (Vite, Webpack, Rollup, etc.)
 */
function getDefaultWasmPath(): string {
  // In browser/bundler context, use import.meta.url to resolve relative paths
  // The WASM files are located at ../../wasm/blsct.js relative to this loader
  // (loader is at dist/browser/bindings/wasm/loader.js, wasm is at wasm/blsct.js)
  try {
    // Use indirect eval to avoid parse-time syntax errors in CommonJS/Jest environments
    // eslint-disable-next-line no-eval
    const importMetaUrl = (0, eval)('typeof import.meta !== "undefined" && import.meta.url');
    if (importMetaUrl) {
      return new URL('../../../../wasm/blsct.mjs', importMetaUrl).href;
    }
  } catch {
    // Fallback for environments where import.meta is not available
  }
  // Fallback to relative path (may not work with bundlers)
  return './wasm/blsct.js';
}

/**
 * Load and initialize the WASM module
 * 
 * @param options - Loading options or legacy wasmPath string
 * @returns Promise resolving to the initialized WASM module
 * 
 * @example
 * // Automatic path resolution (recommended for bundlers)
 * await loadBlsctModule();
 * 
 * @example
 * // Custom WASM path
 * await loadBlsctModule({ wasmPath: '/assets/wasm/blsct.js' });
 * 
 * @example
 * // Pre-loaded WASM binary (for inline/bundled WASM)
 * const wasmBinary = await fetch('/wasm/blsct.wasm').then(r => r.arrayBuffer());
 * await loadBlsctModule({ wasmBinary });
 */
export async function loadBlsctModule(
  options?: string | LoadBlsctModuleOptions
): Promise<BlsctWasmModule> {
  if (moduleInstance) {
    return moduleInstance;
  }

  if (modulePromise) {
    return modulePromise;
  }

  // Handle legacy string parameter (wasmPath)
  const opts: LoadBlsctModuleOptions = typeof options === 'string' 
    ? { wasmPath: options } 
    : (options || {});

  modulePromise = (async () => {
    let BlsctModuleFactory: BlsctModuleFactory;
    let moduleUrl = opts.wasmPath || getDefaultWasmPath();

    try {
      // In Node.js, convert absolute paths to file:// URLs for dynamic import
      const isNode = typeof process !== 'undefined' && process.versions?.node;
      if (isNode && moduleUrl.startsWith('/')) {
        // Use pathToFileURL for proper file:// URL conversion
        const { pathToFileURL } = await import('url');
        moduleUrl = pathToFileURL(moduleUrl).href;
      }
      
      const module = await import(/* webpackIgnore: true */ moduleUrl);
      
      // Handle both ESM default export and CommonJS module.exports
      BlsctModuleFactory = module.default;
      
      // If default is not a function, try other common patterns
      if (typeof BlsctModuleFactory !== 'function') {
        // Try the module itself (CommonJS pattern)
        if (typeof module === 'function') {
          BlsctModuleFactory = module;
        }
        // Try named export BlsctModule
        else if (typeof module.BlsctModule === 'function') {
          BlsctModuleFactory = module.BlsctModule;
        }
        // Try the entire module object as factory
        else if (typeof module === 'object' && module !== null) {
          // Some bundlers wrap the factory in the module object
          const keys = Object.keys(module);
          for (const key of keys) {
            if (typeof module[key] === 'function') {
              BlsctModuleFactory = module[key];
              break;
            }
          }
        }
      }
      
      // If factory still not found, try global fallback (set by script tag loading)
      if (typeof BlsctModuleFactory !== 'function') {
        const globalAny = globalThis as unknown as { BlsctModule?: BlsctModuleFactory };
        if (typeof globalThis !== 'undefined' && typeof globalAny.BlsctModule === 'function') {
          BlsctModuleFactory = globalAny.BlsctModule;
        } else {
          throw new Error(
            `WASM module loaded but factory function not found. ` +
            `Module type: ${typeof module}, keys: ${Object.keys(module || {}).join(', ')}`
          );
        }
      }
    } catch (err) {
      // If dynamic import failed, try global fallback (set by script tag loading)
      const globalAny = globalThis as unknown as { BlsctModule?: BlsctModuleFactory };
      if (typeof globalThis !== 'undefined' && typeof globalAny.BlsctModule === 'function') {
        BlsctModuleFactory = globalAny.BlsctModule;
      } else {
        const originalMessage =
          err instanceof Error
            ? `${err.message}${err.stack ? `\nStack trace:\n${err.stack}` : ''}`
            : String(err);
        throw new Error(
          `Failed to load WASM module from "${moduleUrl}". ` +
          `Ensure the WASM files are built and accessible. ` +
          `If using a bundler, you may need to configure it to handle WASM files. ` +
          `You can also load the WASM via script tag and call setBlsctModule(). ` +
          `Original error: ${originalMessage}`
        );
      }
    }

    // Calculate WASM binary path for locateFile
    const wasmBinaryUrl = moduleUrl.replace(/\.m?js$/, '.wasm');

    // We need a mutable reference to store the module for cryptoGetRandomValues
    let moduleRef: BlsctWasmModule | null = null;
    
    const config: BlsctModuleConfig & { cryptoGetRandomValues?: (bufPtr: number, byteSize: number) => void } = {
      locateFile: (path: string, prefix: string) => {
        if (path.endsWith('.wasm')) {
          // Use the calculated WASM binary path
          return wasmBinaryUrl;
        }
        return prefix + path;
      },
      print: console.log,
      printErr: console.error,
    };
    
    // Set up cryptoGetRandomValues for MCL's random number generation.
    // This must be configured BEFORE module initialization.
    // Prefer Web Crypto API; fall back to Node.js randomFillSync on older Node versions.
    const isNodeRuntime = typeof process !== 'undefined' && !!process.versions?.node;
    let nodeRandomFillSync: ((buf: Uint8Array) => void) | undefined;
    if (isNodeRuntime && !(typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues)) {
      try {
        const nodeCrypto = await import('crypto');
        nodeRandomFillSync = (nodeCrypto as unknown as { randomFillSync?: (buf: Uint8Array) => void }).randomFillSync;
      } catch {
        nodeRandomFillSync = undefined;
      }
    }

    if ((typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) || nodeRandomFillSync) {
      config.cryptoGetRandomValues = (bufPtr: number, byteSize: number) => {
        if (!moduleRef || !moduleRef.HEAPU8) {
          throw new Error('Module not initialized yet');
        }
        const buffer = moduleRef.HEAPU8.subarray(bufPtr, bufPtr + byteSize);
        if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
          globalThis.crypto.getRandomValues(buffer);
          return;
        }
        if (nodeRandomFillSync) {
          nodeRandomFillSync(buffer);
          return;
        }
        throw new Error('No secure random source available for WASM crypto');
      };
    }
    
    // If wasmBinary is provided, use it directly
    if (opts.wasmBinary) {
      config.wasmBinary = opts.wasmBinary;
    } else {
      // In Node.js, load the WASM file directly using fs since fetch doesn't work with file:// URLs
      const isNode = typeof process !== 'undefined' && process.versions?.node;
      if (isNode) {
        try {
          // Convert file:// URL or path to filesystem path
          let wasmPath = wasmBinaryUrl;
          if (wasmPath.startsWith('file://')) {
            const { fileURLToPath } = await import('url');
            wasmPath = fileURLToPath(wasmPath);
          }
          const fs = await import('fs');
          const wasmBuffer = fs.readFileSync(wasmPath);
          config.wasmBinary = wasmBuffer.buffer.slice(
            wasmBuffer.byteOffset,
            wasmBuffer.byteOffset + wasmBuffer.byteLength
          );
        } catch (fsErr) {
          // If fs read fails, let Emscripten try its default loading
          console.warn('Failed to load WASM via fs, falling back to Emscripten loader:', fsErr);
        }
      }
    }

    const instance = await BlsctModuleFactory(config);
    
    // Set moduleRef so cryptoGetRandomValues can access HEAPU8
    moduleRef = instance;
    
    // Also add cryptoGetRandomValues directly to the instance for MCL web crypto support
    ensureCryptoGetRandomValues(instance);
    
    // Initialize the library
    // Note: With correct build flags (BLS_ETH, MCLBN_FP_UNIT_SIZE=6, MCLBN_FR_UNIT_SIZE=4),
    // blsInit should succeed. If it fails, a WASM exception will be thrown.
    try {
      instance._init();
    } catch (e) {
      // WASM exceptions are often returned as integer pointers
      const errorInfo = typeof e === 'number' 
        ? `WASM exception pointer: ${e}. This usually indicates blsInit() failed due to MCLBN_COMPILED_TIME_VAR mismatch.`
        : String(e);
      throw new Error(
        `Failed to initialize BLSCT library. ${errorInfo}\n` +
        `Ensure the WASM module was built with consistent BLS_ETH and MCLBN_*_UNIT_SIZE flags.`
      );
    }
    
    moduleInstance = instance;
    return instance;
  })();

  return modulePromise;
}

/**
 * Get the loaded module instance
 */
export function getBlsctModule(): BlsctWasmModule {
  if (!moduleInstance) {
    throw new Error(
      'WASM module not loaded. Call loadBlsctModule() first and await its result.'
    );
  }
  return moduleInstance;
}

/**
 * Check if the module is loaded
 */
export function isModuleLoaded(): boolean {
  return moduleInstance !== null;
}

/**
 * Reset the module instance
 */
export function resetModule(): void {
  moduleInstance = null;
  modulePromise = null;
}

/**
 * Set a pre-initialized WASM module instance.
 * 
 * This is useful when the dynamic import fails (e.g., due to bundler ESM/CJS issues)
 * and you need to load the module via script tag and initialize it manually.
 * 
 * @param module - The initialized WASM module instance
 * @param skipInit - If true, skip calling _init() (use if already initialized)
 * 
 * @example
 * // Load via script tag
 * await new Promise((resolve, reject) => {
 *   const script = document.createElement('script');
 *   script.src = '/wasm/blsct.js';
 *   script.onload = resolve;
 *   script.onerror = reject;
 *   document.head.appendChild(script);
 * });
 * 
 * // Initialize manually
 * const wasmModule = await window.BlsctModule({
 *   locateFile: (path) => path.endsWith('.wasm') ? '/wasm/blsct.wasm' : path
 * });
 * 
 * // Set it so the library uses this instance
 * setBlsctModule(wasmModule);
 */
export function setBlsctModule(module: BlsctWasmModule, skipInit = false): void {
  // Add cryptoGetRandomValues if not present
  ensureCryptoGetRandomValues(module);
  
  // Initialize if not skipped
  if (!skipInit) {
    try {
      module._init();
    } catch (e) {
      const errorInfo = typeof e === 'number' 
        ? `WASM exception pointer: ${e}. This usually indicates blsInit() failed.`
        : String(e);
      throw new Error(`Failed to initialize BLSCT library. ${errorInfo}`);
    }
  }
  
  moduleInstance = module;
  modulePromise = Promise.resolve(module);
}
