import {
  addToTxHexVec,
  addToTxInVec,
  addToTxOutVec,
  aggregateTransactions as aggregateTransactionsNative,
  BLSCT_IN_AMOUNT_ERROR,
  BLSCT_OUT_AMOUNT_ERROR,
  buildCTx,
  buildCTxWithChange,
  castToUint8_tPtr,
  createTxHexVec,
  createTxInVec,
  createTxOutVec,
  deleteCTx,
  deleteTxHexVec,
  deleteTxInVec,
  deleteTxOutVec,
  deserializeCTx,
  freeObj,
  getCTxId,
  getCTxIns,
  getCTxOuts,
  getValueAsCStr,
  serializeCTx,
} from './blsct'

import { CTxId } from './ctxId'
import { CTxIns } from './ctxIns'
import { CTxOuts } from './ctxOuts'
import { ManagedObj } from './managedObj'
import { SubAddr } from './subAddr'
import { TxIn } from './txIn'
import { TxOut } from './txOut'

/** Represents a confidential transaction. Also known as `CMutableTransaction` on the C++ side.
 * Examples:
 * ```ts
 * const { CTx, CTxId, TxIn, TxOut, ChildKey, Scalar, SubAddr, SubAddrId, DoublePublicKey, OutPoint, PublicKey, TokenId, CTX_ID_SIZE } = require('navio-blsct')
 * const { randomBytes } = require('crypto')
 * const cTxIdHex = randomBytes(CTX_ID_SIZE).toString('hex')
 * const cTxId = CTxId.deserialize(cTxIdHex)
 * const numTxIn = 1
 * const numTxOut = 1
 * const defaultFee = 200000
 * const fee = (numTxIn + numTxOut) * defaultFee
 * const outAmount = 10000
 * const inAmount = fee + outAmount
 * const outPoint = OutPoint.generate(cTxId)
 * const gamma = 100
 * const spendingKey = Scalar.random()
 * const tokenId = TokenId.default()
 * const txIn = TxIn.generate(inAmount, gamma, spendingKey, tokenId, outPoint)
 * const viewKey = new ChildKey().toTxKey().toViewKey()
 * const spendingPubKey = new PublicKey()
 * const subAddrId = SubAddrId.generate(123, 456)
 * const subAddr = SubAddr.generate(viewKey, spendingPubKey, subAddrId)
 * const txOut = TxOut.generate(subAddr, outAmount, 'navio')
 * // The fee is computed from the transaction's size, so the inputs rarely
 * // cover outputs + fee exactly: pass a change address you own.
 * const changeAddr = SubAddr.generate(viewKey, spendingPubKey, SubAddrId.generate(-1, 0))
 * const cTx = CTx.generate([txIn], [txOut], changeAddr)
 * for (const cTxIn of cTx.getCTxIns()) {
 *   console.log(`prevOutHash: ${cTxIn.getPrevOutHash()}`)
 *   console.log(`prevOutN: ${cTxIn.getPrevOutN()}`)
 *   console.log(`scriptSig: ${cTxIn.getScriptSig()}`)
 *   console.log(`sequence: ${cTxIn.getSequence()}`)
 *   console.log(`scriptWitness: ${cTxIn.getScriptWitness()}`)
 * }
 * for (const cTxOut of cTx.getCTxOuts()) {
 *   console.log(`value: ${cTxOut.getValue()}`)
 *   console.log(`script_pub_key: ${cTxOut.getScriptPubKey()}`)
 *   console.log(`blsctData.spendingKey: ${cTxOut.blsctData().getSpendingKey()}`)
 *   console.log(`blsctData.ephemeralKey: ${cTxOut.blsctData().getEphemeralKey()}`)
 *   console.log(`blsctData.blindingKey: ${cTxOut.blsctData().getBlindingKey()}`)
 *   console.log(`blsctData.viewTag: ${cTxOut.blsctData().getViewTag()}`)
 *   const rp = cTxOut.blsctData().getRangeProof()
 *   console.log(`blsctData.rangeProof.A: ${rp.get_A()}`)
 *   console.log(`blsctData.rangeProof.A_wip: ${rp.get_A_wip()}`)
 *   console.log(`blsctData.rangeProof.B: ${rp.get_B()}`)
 *   console.log(`blsctData.rangeProof.r_prime: ${rp.get_r_prime()}`)
 *   console.log(`blsctData.rangeProof.s_prime: ${rp.get_s_prime()}`)
 *   console.log(`blsctData.rangeProof.delta_prime: ${rp.get_delta_prime()}`)
 *   console.log(`blsctData.rangeProof.alpha_hat: ${rp.get_alpha_hat()}`)
 *   console.log(`blsctData.rangeProof.tau_x: ${rp.get_tau_x()}`)
 *   console.log(`tokenId: token=${cTxOut.getTokenId().getToken()}, subid=${cTxOut.getTokenId().getSubid()}`)
 *   console.log(`vector_predicate: ${cTxOut.getVectorPredicate()}`)
 * }
 * const ser = cTx.serialize()
 * const deser = CTx.deserialize(ser)
 * ser === deser.serialize() // true 
 */
export class CTx extends ManagedObj {
  constructor(obj: any) {
    super(obj, () => deleteCTx(obj))
  }

  /** Constructs a new `CTx` instance.
   * @param srcTxIns - An array of `TxIn` objects representing the transaction inputs.
   * @param srcTxOuts - An array of `TxOut` objects representing the transaction outputs.
   * @param changeAddr - Where to pay change. Without one, the build fails
   *   unless the inputs cover the outputs plus the size-based fee exactly:
   *   libblsct refuses to pay change to a key nobody owns.
   * @returns A new `CTx` instance.
   */
  static generate(
    txIns: TxIn[],
    txOuts: TxOut[],
    changeAddr?: SubAddr
  ): CTx {
    // create vector and add txIns to it
    const txInVec = createTxInVec()
    for (const txIn of txIns) {
      addToTxInVec(txInVec, txIn.value())
    }

    // create vector and add txOuts to it
    const txOutVec = createTxOutVec()
    for (const txOut of txOuts) {
      addToTxOutVec(txOutVec, txOut.value())
    }

    const rv = changeAddr === undefined
      ? buildCTx(txInVec, txOutVec)
      : buildCTxWithChange(txInVec, txOutVec, changeAddr.value())

    // free the temporary vectors
    deleteTxInVec(txInVec)
    deleteTxOutVec(txOutVec)

    if (rv.result === BLSCT_IN_AMOUNT_ERROR) {
      freeObj(rv)
      throw new Error(`Failed to build transaction. txIns[${rv.in_amount_err_index}] has an invalid amount`)
    }
    if (rv.result === BLSCT_OUT_AMOUNT_ERROR) {
      freeObj(rv)
      throw new Error(`Failed to build transaciton. tx_outs[${rv.out_amount_err_index}] has an invalid amount`)
    }

    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`building tx failed. Error code = ${rv.result}`)
    }

    const ctx = CTx.fromObjAndSize(rv.ctx, 0)
    freeObj(rv)
    return ctx
  }

  /** Aggregates one or more signed transaction hex strings into a single signed transaction.
   * @param txHexes - Signed transaction hex strings to aggregate.
   * @returns The aggregated signed transaction as a hexadecimal string.
   */
  static aggregateTransactions(txHexes: string[]): string {
    if (txHexes.length === 0) {
      throw new Error('At least one signed transaction is required')
    }

    const txHexVec = createTxHexVec()
    try {
      for (const txHex of txHexes) {
        addToTxHexVec(txHexVec, txHex)
      }

      const rv = aggregateTransactionsNative(txHexVec)
      if (rv.result !== 0) {
        freeObj(rv)
        throw new Error(`Failed to aggregate signed transactions. Error code = ${rv.result}`)
      }

      try {
        return getValueAsCStr(rv)
      } finally {
        freeObj(rv.value)
        freeObj(rv)
      }
    } finally {
      deleteTxHexVec(txHexVec)
    }
  }

  override value(): any {
    return castToUint8_tPtr(this.obj)
  }

  /** Returns the transaction ID of this confidential transaction.
   * @returns The transaction ID.
   */
  getCTxId(): CTxId {
    const txIdHex = getCTxId(this.value())
    return CTxId.deserialize(txIdHex)
  }

  /** Returns the number of transaction inputs in this confidential transaction.
   * @returns The number of transaction inputs.
   */
  getCTxIns(): CTxIns {
    return new CTxIns(getCTxIns(this.value()))
  }

  /** Returns the number of transaction outputs in this confidential transaction.
   * @returns The number of transaction outputs.
   */ 
  getCTxOuts(): CTxOuts {
    return new CTxOuts(getCTxOuts(this.value()))
  }

  override serialize(): string {
    return serializeCTx(this.value())
  }

  /** Deserializes a hexadecimal string into a `CTx` instance.
   * @param hex - The hexadecimal string to deserialize.
   * @returns A new `CTx` instance.
   */
  static deserialize(hex: string): CTx {
    return CTx._deserialize(hex, deserializeCTx)
  }
}
