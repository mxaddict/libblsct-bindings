/**
 * Basic browser/WASM tests
 * 
 * These tests verify that the WASM module can be loaded and basic
 * operations work in a browser-like environment.
 */

// Note: These tests require the WASM module to be built first
// Run: npm run build:wasm && npm run build:browser

import * as path from 'path';

// Store the dynamically imported modules
let wasmLoader: any = null;
let blsctBrowser: any = null;
let wasmLoadError: Error | null = null;

// Get the WASM path from Jest globals
declare const WASM_PATH: string | undefined;

function getWasmPath(): string {
  // Use Jest global if available
  if (typeof WASM_PATH !== 'undefined') {
    return WASM_PATH;
  }
  // Fallback: compute path relative to project root
  // In Jest, process.cwd() is the project root
  return path.resolve(process.cwd(), 'wasm/blsct.js');
}

describe('Browser WASM Module', () => {
  beforeAll(async () => {
    try {
      // Dynamically import the WASM loader
      wasmLoader = await import('../bindings/wasm/index.js');
      
      // Load the WASM module with absolute path
      const wasmPath = getWasmPath();
      console.log('Loading WASM from:', wasmPath);
      await wasmLoader.loadBlsctModule(wasmPath);

      // THEN dynamically import the browser modules after WASM is loaded
      blsctBrowser = await import('../index.browser.js');
    } catch (err) {
      wasmLoadError = err instanceof Error ? err : new Error(String(err));
    }
  });

  // Helper that throws if WASM failed to load
  const requireWasm = () => {
    if (wasmLoadError) {
      throw new Error(`WASM module failed to load: ${wasmLoadError.message}`);
    }
    if (!wasmLoader || !blsctBrowser) {
      throw new Error('WASM module not initialized');
    }
  };

  describe('Module Loading', () => {
    it('should load WASM module', () => {
      requireWasm();
      expect(wasmLoader.isModuleLoaded()).toBe(true);
    });

    it('should get WASM module instance', () => {
      requireWasm();
      const module = wasmLoader.getBlsctModule();
      expect(module).toBeDefined();
      expect(typeof module._malloc).toBe('function');
      expect(typeof module._free).toBe('function');
    });
  });

  describe('Scalar Operations', () => {
    it('should create random scalars', () => {
      requireWasm();
      const s1 = blsctBrowser.Scalar.random();
      const s2 = blsctBrowser.Scalar.random();
      expect(s1).toBeDefined();
      expect(s2).toBeDefined();
      expect(s1.equals(s2)).toBe(false);
    });

    it('should create scalar from number', () => {
      requireWasm();
      const s = new blsctBrowser.Scalar(12345);
      // Use toBigInt() for consistent BigInt handling
      expect(s.toBigInt()).toBe(12345n);
    });

    it('should create scalar from BigInt', () => {
      requireWasm();
      const bigValue = 9007199254740993n; // > Number.MAX_SAFE_INTEGER
      const s = new blsctBrowser.Scalar(bigValue);
      expect(s.toBigInt()).toBe(bigValue);
    });

    it('should allow toNumber() for small values', () => {
      requireWasm();
      const s = new blsctBrowser.Scalar(42);
      expect(s.toNumber()).toBe(42);
    });

    it('should throw RangeError for toNumber() with large values', () => {
      requireWasm();
      // Create a scalar from a large BigInt value
      const bigValue = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
      const s = new blsctBrowser.Scalar(bigValue);
      expect(() => s.toNumber()).toThrow(RangeError);
    });

    it('should serialize and deserialize scalars', () => {
      requireWasm();
      const s1 = blsctBrowser.Scalar.random();
      const hex = s1.serialize();
      const s2 = blsctBrowser.Scalar.deserialize(hex);
      expect(s1.equals(s2)).toBe(true);
    });

    it('should round-trip 256-bit scalar values without truncation', () => {
      // Regression test: Previously, serialize() returned truncated output (e.g., "136580" instead of 64 chars)
      requireWasm();
      const inputHex = '30df5249afed661e9ffe15d9f4fcd7f5b42c05b3d38d6818c5145fab0dd55212';
      const scalar = blsctBrowser.Scalar.deserialize(inputHex);
      const outputHex = scalar.serialize();
      
      // The serialized output should be 64 characters (256 bits = 32 bytes = 64 hex chars)
      expect(outputHex.length).toBe(64);
      
      // Round-trip should preserve the value (may have different case or leading zeros)
      const roundTripped = blsctBrowser.Scalar.deserialize(outputHex);
      expect(scalar.equals(roundTripped)).toBe(true);
    });

    
  });

  describe('Point Operations', () => {
    it('should create random points', () => {
      requireWasm();
      const p1 = blsctBrowser.Point.random();
      const p2 = blsctBrowser.Point.random();
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();
      expect(p1.equals(p2)).toBe(false);
    });

    it('should serialize and deserialize points', () => {
      requireWasm();
      const p1 = blsctBrowser.Point.random();
      const hex = p1.serialize();
      const p2 = blsctBrowser.Point.deserialize(hex);
      expect(p1.equals(p2)).toBe(true);
    });

    it('should multiply point by scalar', () => {
      requireWasm();
      const p = blsctBrowser.Point.random();
      const s = new blsctBrowser.Scalar(2);
      const result = p.mulScalar(s);
      expect(result).toBeDefined();
      expect(result.equals(p)).toBe(false);
    });

  
  });

  describe('PublicKey Operations', () => {
    it('should create public key from scalar', () => {
      requireWasm();
      const sk = blsctBrowser.Scalar.random();
      const pk = blsctBrowser.PublicKey.fromScalar(sk);
      expect(pk).toBeDefined();
    });

    it('should create random public key', () => {
      requireWasm();
      const pk1 = blsctBrowser.PublicKey.random();
      const pk2 = blsctBrowser.PublicKey.random();
      expect(pk1).toBeDefined();
      expect(pk2).toBeDefined();
      expect(pk1.equals(pk2)).toBe(false);
    });

    it('should serialize and deserialize public keys', () => {
      requireWasm();
      const pk1 = blsctBrowser.PublicKey.random();
      const hex = pk1.serialize();
      const pk2 = blsctBrowser.PublicKey.deserialize(hex);
      expect(pk1.equals(pk2)).toBe(true);
    });
  });

  describe('Signature Operations', () => {
    it('should generate signatures', () => {
      requireWasm();
      const privKey = blsctBrowser.Scalar.random();
      const message = 'test message';
      const sig = blsctBrowser.Signature.generate(privKey, message);
      expect(sig).toBeDefined();
    });

    it('should verify signatures', () => {
      requireWasm();
      const privKey = blsctBrowser.Scalar.random();
      const pubKey = blsctBrowser.PublicKey.fromScalar(privKey);
      const message = 'test message';
      const sig = blsctBrowser.Signature.generate(privKey, message);
      
      expect(sig.verify(pubKey, message)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      requireWasm();
      const privKey = blsctBrowser.Scalar.random();
      const pubKey = blsctBrowser.PublicKey.fromScalar(privKey);
      const message = 'test message';
      const wrongMessage = 'wrong message';
      const sig = blsctBrowser.Signature.generate(privKey, message);
      
      expect(sig.verify(pubKey, wrongMessage)).toBe(false);
    });

    it('should serialize and deserialize signatures', () => {
      requireWasm();
      const privKey = blsctBrowser.Scalar.random();
      const message = 'test message';
      const sig1 = blsctBrowser.Signature.generate(privKey, message);
      const hex = sig1.serialize();
      const sig2 = blsctBrowser.Signature.deserialize(hex);
      // Compare serialized values since Signature doesn't have equals()
      expect(sig1.serialize()).toBe(sig2.serialize());
    });
  });

  describe('Token ID Operations', () => {
    it('should create default token ID', () => {
      requireWasm();
      const tokenId = blsctBrowser.TokenId.default();
      expect(tokenId).toBeDefined();
    });

    it('should serialize and deserialize token IDs', () => {
      requireWasm();
      const tid1 = blsctBrowser.TokenId.default();
      const hex = tid1.serialize();
      const tid2 = blsctBrowser.TokenId.deserialize(hex);
      expect(tid1.equals(tid2)).toBe(true);
    });
  });

  describe('Range Proof Operations', () => {
    it('should create range proofs', () => {
      requireWasm();
      const amounts = [1000];
      const nonce = blsctBrowser.Point.random();
      const message = 'test';
      const tokenId = blsctBrowser.TokenId.default();
      
      const proof = blsctBrowser.RangeProof.generate(amounts, nonce, message, tokenId);
      expect(proof).toBeDefined();
    });

    it('should verify range proofs', () => {
      requireWasm();
      const amounts = [1000];
      const nonce = blsctBrowser.Point.random();
      const message = 'test';
      const tokenId = blsctBrowser.TokenId.default();
      
      const proof = blsctBrowser.RangeProof.generate(amounts, nonce, message, tokenId);
      expect(blsctBrowser.RangeProof.verifyProofs([proof])).toBe(true);
    });

    it('should serialize and deserialize range proofs', () => {
      requireWasm();
      const amounts = [1000];
      const nonce = blsctBrowser.Point.random();
      const message = 'test';
      const tokenId = blsctBrowser.TokenId.default();
      
      const proof1 = blsctBrowser.RangeProof.generate(amounts, nonce, message, tokenId);
      const hex = proof1.serialize();
      const proof2 = blsctBrowser.RangeProof.deserialize(hex);
      expect(proof2).toBeDefined();
    });
  });

  describe('Address Operations', () => {
    it('should create and encode addresses', () => {
      requireWasm();
      const dpk = new blsctBrowser.DoublePublicKey();
      const encoded = dpk.encode();
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode addresses', () => {
      requireWasm();
      const dpk1 = new blsctBrowser.DoublePublicKey();
      const encoded = dpk1.encode();
      const dpk2 = blsctBrowser.DoublePublicKey.decode(encoded);
      expect(dpk2).toBeDefined();
      expect(dpk1.equals(dpk2)).toBe(true);
    });
  });

  describe('Transaction Building', () => {
    it('should create transaction input', () => {
      requireWasm();
      // Create an OutPoint with a dummy tx ID
      const txIdHex = '0000000000000000000000000000000000000000000000000000000000000000';
      const ctxId = blsctBrowser.CTxId.deserialize(txIdHex);
      const outpoint = blsctBrowser.OutPoint.generate(ctxId);
      const spendingKey = blsctBrowser.Scalar.random();
      const amount = 1000;  // TxIn.generate uses number, not BigInt
      const gamma = new blsctBrowser.Scalar(1);
      const tokenId = blsctBrowser.TokenId.default();
      const rbf = false;
      
      const txIn = blsctBrowser.TxIn.generate(amount, gamma, spendingKey, tokenId, outpoint, false, rbf);
      expect(txIn).toBeDefined();
    });

    it('should create transaction output', () => {
      requireWasm();
      // TxOut.generate expects a SubAddr, not a DoublePublicKey
      const dpk = new blsctBrowser.DoublePublicKey();
      const subAddr = blsctBrowser.SubAddr.fromDoublePublicKey(dpk);
      const amount = 1000;  // TxOut.generate uses number, not BigInt
      const memo = 'test memo';
      const tokenId = blsctBrowser.TokenId.default();
      
      const txOut = blsctBrowser.TxOut.generate(subAddr, amount, memo, tokenId);
      expect(txOut).toBeDefined();
    });

    it('should round-trip a memo with multi-byte characters', () => {
      requireWasm();
      const subAddr = blsctBrowser.SubAddr.fromDoublePublicKey(new blsctBrowser.DoublePublicKey());
      const memo = 'navio ナビオ \u{1F680}';
      const txOut = blsctBrowser.TxOut.generate(subAddr, 1000, memo);
      expect(txOut.getMemo()).toBe(memo);
    });

    it('should reject a memo with an embedded NUL', () => {
      requireWasm();
      const subAddr = blsctBrowser.SubAddr.fromDoublePublicKey(new blsctBrowser.DoublePublicKey());
      expect(() => blsctBrowser.TxOut.generate(subAddr, 1000, 'nav\0io')).toThrow();
    });

    it('should aggregate signed transactions', () => {
      requireWasm();

      const makeSignedTxHex = (hexByte: string, outAmount: number): string => {
        const tokenId = blsctBrowser.TokenId.default();
        const ctxId = blsctBrowser.CTxId.deserialize(hexByte.repeat(32));
        const outPoint = blsctBrowser.OutPoint.generate(ctxId);
        const txIn = blsctBrowser.TxIn.generate(
          250000,
          new blsctBrowser.Scalar(100),
          new blsctBrowser.Scalar(101),
          tokenId,
          outPoint,
          false,
          false,
        );

        const destination = blsctBrowser.SubAddr.generate(
          new blsctBrowser.Scalar(91),
          blsctBrowser.PublicKey.fromScalar(new blsctBrowser.Scalar(92)),
          blsctBrowser.SubAddrId.generate(7, 9),
        );
        const txOut = blsctBrowser.TxOut.generate(
          destination,
          outAmount,
          `memo-${hexByte}`,
          tokenId,
          blsctBrowser.TxOutputType.Normal,
          0,
          false,
          new blsctBrowser.Scalar(777),
        );

        const unsignedTx = blsctBrowser.UnsignedTransaction.create();
        unsignedTx.addInput(blsctBrowser.UnsignedInput.fromTxIn(txIn));
        unsignedTx.addOutput(blsctBrowser.UnsignedOutput.fromTxOut(txOut));
        unsignedTx.setFee(1000);
        return unsignedTx.sign();
      };

      const txHex1 = makeSignedTxHex('11', 10000);
      const txHex2 = makeSignedTxHex('22', 20000);
      const aggregatedHex = blsctBrowser.CTx.aggregateTransactions([txHex1, txHex2]);

      expect(aggregatedHex).toMatch(/^[0-9a-f]+$/);
      const aggregatedTx = blsctBrowser.CTx.deserialize(aggregatedHex);
      expect(aggregatedTx.getCTxIns().size()).toBe(2);
      expect(aggregatedTx.getCTxOuts().size()).toBe(3);
    });
  });

  describe('Stake Delegation', () => {
    const STAKE = 1_000_000_000_000;

    const genDest = () =>
      blsctBrowser.SubAddr.generate(
        blsctBrowser.Scalar.random(),
        blsctBrowser.PublicKey.random(),
        blsctBrowser.SubAddrId.generate(0, 0)
      );

    it('should open a delegation payload to its owner', () => {
      requireWasm();
      const delegateKey = blsctBrowser.Point.random();
      const nonce = blsctBrowser.Point.random();
      const dataHex = blsctBrowser.buildStakeDelegationDataHex(
        STAKE, blsctBrowser.Scalar.random(), 'reward-address', delegateKey, nonce
      );

      expect(blsctBrowser.isStakeDelegationDataHex(dataHex)).toBe(true);
      expect(blsctBrowser.isStakeDelegationDataHex('00ff')).toBe(false);
      // Reads both fields of the owner-info struct from WASM memory.
      const info = blsctBrowser.parseStakeDelegationOwnerInfo(dataHex, nonce);
      expect(info.delegateKey.equals(delegateKey)).toBe(true);
      expect(info.rewardAddress).toBe('reward-address');
      expect(() =>
        blsctBrowser.parseStakeDelegationOwnerInfo(dataHex, blsctBrowser.Point.random())
      ).toThrow();
    });

    it('should delegate a staked output and refuse a normal one', () => {
      requireWasm();
      const dest = genDest();
      const genOutput = (outputType: number) =>
        blsctBrowser.UnsignedOutput.fromTxOut(
          blsctBrowser.TxOut.generate(dest, STAKE, '', undefined, outputType, STAKE, false, blsctBrowser.Scalar.random())
        );

      const staked = genOutput(blsctBrowser.TxOutputType.StakedCommitment);
      const before = staked.serialize();
      staked.setStakeDelegation(dest, blsctBrowser.Point.random(), 'reward-address');
      expect(staked.serialize()).not.toBe(before);

      const normal = genOutput(blsctBrowser.TxOutputType.Normal);
      expect(() =>
        normal.setStakeDelegation(dest, blsctBrowser.Point.random(), 'reward-address')
      ).toThrow();
    });
  });

  describe('Chain Configuration', () => {
    it('should get and set chain', () => {
      requireWasm();
      const { getChain, setChain, BlsctChain } = blsctBrowser;
      const originalChain = getChain();
      expect(originalChain).toBeDefined();
      
      // Set to a different chain (use correct case: Regtest not REGTEST)
      setChain(BlsctChain.Regtest);
      expect(getChain()).toBe(BlsctChain.Regtest);
      
      // Restore original
      setChain(originalChain);
    });
  });
});
