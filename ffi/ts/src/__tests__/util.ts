import { CTx } from '../ctx'
import { CTxId } from '../ctxId'
import { DoublePublicKey } from '../keys/doublePublicKey' 
import { OutPoint } from '../outPoint'
import { PublicKey } from '../keys/publicKey'
import { Scalar } from '../scalar'
import { SubAddr } from '../subAddr'
import { TokenId } from '../tokenId'
import { TxIn } from '../txIn'
import { TxOut } from '../txOut'
import {
  CTX_ID_SIZE,
  TxOutputType,
} from '../blsct'

/**
 * Generate random bytes in a cross-platform way (Node.js and browser)
 */
export function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  // Works in both Node.js 19+ and browsers
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for older Node.js versions
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    const buf = nodeCrypto.randomBytes(size);
    bytes.set(buf);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random hex string of given byte length
 */
export function randomHex(byteLength: number): string {
  return bytesToHex(randomBytes(byteLength));
}

export const genCTx = (
  outAmount: number = 10000,
  pkViewKey: PublicKey = PublicKey.random(),
  blindingKey: Scalar = Scalar.random(),
  msg: string = 'navio',
): CTx => {
  const numTxIn = 1
  const numTxOut = 1
  const defaultFee = 200000
  const fee = (numTxIn + numTxOut) * defaultFee
  const inAmount = fee + outAmount

  const ctxIdHex = bytesToHex(randomBytes(CTX_ID_SIZE))
  const ctxId = CTxId.deserialize(ctxIdHex)

  const outPoint = OutPoint.generate(ctxId)
  const gamma = new Scalar(100)
  const spendingKey = Scalar.random()
  const tokenId = TokenId.default()
  const txIn = TxIn.generate(
    inAmount,
    gamma,
    spendingKey,
    tokenId,
    outPoint,
  )
  const pkSpendKey = PublicKey.random()
  const dpk = DoublePublicKey.fromViewAndSpendKeys(pkViewKey, pkSpendKey)
  const subAddr = SubAddr.fromDoublePublicKey(dpk)

  const txOut = TxOut.generate(
    subAddr,
    outAmount,
    msg,
    tokenId,
    TxOutputType.Normal,
    0,
    false,
    blindingKey,
  )
  // The fee is size-based, so the input over-funds it; the remainder is
  // change, which libblsct will only pay to an address someone owns.
  const changeDpk = DoublePublicKey.fromViewAndSpendKeys(PublicKey.random(), PublicKey.random())
  return CTx.generate([txIn], [txOut], SubAddr.fromDoublePublicKey(changeDpk))
}

