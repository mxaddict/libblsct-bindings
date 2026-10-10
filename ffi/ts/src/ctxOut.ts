import {
  castToCTxOut,
  castToUint8_tPtr,
  freeObj,
  getCTxOutBlindingKey,
  getCTxOutEphemeralKey,
  getCTxOutRangeProof,
  getCTxOutScriptPubkey,
  getCTxOutScriptPubKeyHex,
  getCTxOutSpendingKey,
  getCTxOutTokenId,
  getCTxOutValue,
  getCTxOutVectorPredicate,
  getCTxOutViewTag,
  hexToMallocedBuf,
  toHex,
} from './blsct'

import { Point } from './point'
import { RangeProof } from './rangeProof'
import { Script } from './script'
import { TokenId } from './tokenId'

/** Represents a transaction output in a constructed confidential transaction. Also known as `CTxOut` on the C++ side.
 *
 * For code examples, see the `ctx.ts` class documentation.
 */
export class CTxOut {
  private obj: any
  private rangeProofCache?: RangeProof

  constructor(obj: any) {
    this.obj = obj
  }

  /** Returns the value of the transaction output.
   * * @returns The value of the output.
   */
  getValue(): bigint {
    return getCTxOutValue(this.obj)
  }

  /** Returns the `scriptPubKey' of the transaction output.
   * * @returns The `scriptPubKey` of the output.
   */
  getScriptPubKey(): Script {
    const obj = getCTxOutScriptPubkey(this.obj)
    return Script.fromObj(obj)
  }

  /** Returns the whole `scriptPubKey` of the output in hex. Unlike
   * {@link getScriptPubKey}, which holds a fixed-size script, it is not cut
   * off, so a staked commitment's script (`OP_STAKED_COMMITMENT` ...
   * `OP_TRUE`) reads in full.
   * @returns The `scriptPubKey` in hex, empty when the output has none.
   */
  getScriptPubKeyHex(): string {
    return getCTxOutScriptPubKeyHex(this.obj)
  }

  /** Returns the token ID associated with the transaction output.
   * @returns The token ID of the output.
   */
  getTokenId(): TokenId {
    const obj = getCTxOutTokenId(this.obj)
    return TokenId.fromObj(obj)
  }

  /** Returns the vector predicate of the transaction output.
   * * @returns The vector predicate as a hexadecimal string.
   */
  getVectorPredicate(): string {
    const rv = getCTxOutVectorPredicate(this.obj)
    if (rv.result != 0) {
      freeObj(rv)
      throw new Error(`Failed to get vector predicate. Error code = ${rv.result}`)
    }
    if (rv.value_size === 0) {
      freeObj(rv)
      return ""
    }
    const buf = castToUint8_tPtr(rv.value)
    const result = toHex(buf, rv.value_size)
    freeObj(rv)
    return result
  }

  /** Returns the spending key associated with the transaction output.
   * @returns The spending key of the output, a public point.
   */
  getSpendingKey(): Point {
    const obj = getCTxOutSpendingKey(this.obj)
    return Point.fromObj(obj)
  }
  
  /** Returns the ephemeral key associated with the transaction output.
   * @returns The ephemeral key of the output.
   */
  getEphemeralKey(): Point {
    const obj = getCTxOutEphemeralKey(this.obj)
    return Point.fromObj(obj)
  }

  /** Returns the blinding key associated with the transaction output.
   * @returns The blinding key of the output, a public point.
   */
  getBlindingKey(): Point {
    const obj = getCTxOutBlindingKey(this.obj)
    return Point.fromObj(obj)
  }

  /** Returns the range proof associated with the transaction output.
   * @returns The range proof of the output.
   */
  getRangeProof(): RangeProof {
    if (this.rangeProofCache !== undefined) {
      return this.rangeProofCache
    }
    const rv = getCTxOutRangeProof(this.obj)
    this.rangeProofCache = RangeProof.fromObjAndSize(rv.value, rv.value_size)
    freeObj(rv)
    return this.rangeProofCache
  }

  /** Returns the view tag associated with the view of the transaction output.
   * @returns The view tag of the output.
   */
  getViewTag(): number {
    return getCTxOutViewTag(this.obj)
  }
}
