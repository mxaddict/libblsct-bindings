import {
  castToScript,
  deserializeScript,
  serializeScript,
} from './blsct'

import { ManagedObj } from './managedObj';

/** Represents a script, which may be a scriptPubKey, scriptSig, or scriptWitness. Also known as `CScript` on the C++ side.
 *
 * A `Script` appears as an attribute of `CTxOut` (scriptPubKey) or `CTxIn` (scriptSig and scriptWitness), and is not meant to be instantiated directly.
 *
 * Examples:
 * ```ts
 * const { CTx, CTxId, TxIn, TxOut, OutPoint, Scalar, SubAddr, DoublePublicKey, TokenId, Script, CTX_ID_SIZE } = require('navio-blsct')
 * const { randomBytes } = require('crypto')
 * const numTxIn = 1
 * const numTxOut = 1
 * const defaultFee = 200000
 * const fee = (numTxIn + numTxOut) * defaultFee
 * const outAmount = 10000
 * const inAmount = fee + outAmount
 * const cTxIdHex = randomBytes(CTX_ID_SIZE).toString('hex')
 * const cTxId = CTxId.deserialize(cTxIdHex)
 * const outPoint = OutPoint.generate(cTxId)
 * const gamma = 100
 * const spendingKey = Scalar.random()
 * const tokenId = TokenId.default()
 * const txIn = TxIn.generate(inAmount, gamma, spendingKey, tokenId, outPoint)
 * const subAddr = SubAddr.fromDoublePublicKey(DoublePublicKey.random())
 * const txOut = TxOut.generate(subAddr, outAmount, 'navio')
 * const changeAddr = SubAddr.fromDoublePublicKey(DoublePublicKey.random())
 * const cTx = CTx.generate([txIn], [txOut], changeAddr)
 * const cTxOuts = cTx.getCTxOuts()
 * const scriptPubKey = cTxOuts[0].getScriptPubKey()
 * const ser = scriptPubKey.serialize()
 * const deser = Script.deserialize(ser)
 * deser.serialize() === ser // true
 * ```
 */
export class Script extends ManagedObj {
  constructor(obj: any) {
    super(obj)
  }

  override value(): any {
    return castToScript(this.obj)
  }

  override serialize(): string {
    return serializeScript(this.value())
  }

  /** Deserializes a `Script` from its hexadecimal representation.
   *
   * @param hex - The hexadecimal string to deserialize.
   * @returns A new `Script` instance.
   */
  static deserialize(
    this: new (obj: any) => Script,
    hex: string
  ): Script {
    return Script._deserialize(hex, deserializeScript)
  }
}

