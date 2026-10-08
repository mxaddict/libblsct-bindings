import assert from 'node:assert'

const blsct = require('../build/Release/blsct.node')

if (!blsct._initialized) {
  blsct.init()
  blsct._initialized = true
}

export const CTX_ID_SIZE = blsct.CTX_ID_SIZE
export const POINT_SIZE = blsct.POINT_SIZE
export const SCRIPT_SIZE = blsct.SCRIPT_SIZE
export const UINT256_SIZE = blsct.UINT256_SIZE
export const BLSCT_IN_AMOUNT_ERROR = blsct.BLSCT_IN_AMOUNT_ERROR
export const BLSCT_OUT_AMOUNT_ERROR = blsct.BLSCT_OUT_AMOUNT_ERROR

export enum BlsctChain {
  Mainnet = 0,
  Testnet = 1,
  Signet = 2,
  Regtest = 3,
}

export enum TxOutputType {
  Normal,
  StakedCommitment,
}

export enum BlsctTokenType {
  BlsctToken = 0,
  BlsctNft = 1,
}

export enum BlsctPredicateType {
  BlsctCreateTokenPredicateType = 0,
  BlsctMintTokenPredicateType = 1,
  BlsctMintNftPredicateType = 2,
  BlsctPayFeePredicateType = 3,
  BlsctDataPredicateType = 4,
  BlsctInvalidPredicateType = 255,
}

export interface BlsctRetVal {
  value: any
  value_size: number
  result: number
}

export interface BlsctAmountsRetVal{
  result: number
  value: any
}

export interface BlsctBoolRetVal {
  value: boolean,
  result: number
}

export interface BlsctCTxRetVal {
  result: number
  ctx: any
  in_amount_err_index: number
  out_amount_err_index: number
}

// address
export const decodeAddress = (addrStr: string): BlsctRetVal => {
  return blsct.decode_address(addrStr)
}
export const encodeAddress = (
  dpk: any,
  encoding: number
): BlsctRetVal => {
  return blsct.encode_address(dpk, encoding)
}
export const Bech32 = blsct.Bech32
export const Bech32M = blsct.Bech32M

// chain
export const getChain = (): BlsctChain => {
  return blsct.get_blsct_chain()
}

export const setChain = (chain: BlsctChain): void => {
  blsct.set_blsct_chain(chain)
}

// child key
export const fromSeedToChildKey = (seed: any): any => {
  return blsct.from_seed_to_child_key(seed)
}
export const fromChildKeyToBlindingKey = (childKey: any): any => {
  return blsct.from_child_key_to_blinding_key(childKey)
}
export const fromChildKeyToTokenKey = (childKey: any): any => {
  return blsct.from_child_key_to_token_key(childKey)
}
export const fromChildKeyToTxKey = (childKey: any): any => {
  return blsct.from_child_key_to_tx_key(childKey)
}

// ctx
export const addToTxInVec = (vec: any, txIn: any): void => {
  return blsct.add_to_tx_in_vec(vec, txIn)
}

export const addToTxOutVec = (vec: any, txOut: any): void => {
  return blsct.add_to_tx_out_vec(vec, txOut)
}

export const buildCTx = (txIns: any, txOuts: any): BlsctCTxRetVal => {
  return blsct.build_ctx(txIns, txOuts)
}

export const buildCTxWithChange = (txIns: any, txOuts: any, changeAddr: any): BlsctCTxRetVal => {
  return blsct.build_ctx_with_change(txIns, txOuts, changeAddr)
}

export const createTxInVec = (): any => {
  return blsct.create_tx_in_vec()
}

export const createTxOutVec = (): any => {
  return blsct.create_tx_out_vec()
}

export const deleteTxInVec = (txInVec: any): any => {
  return blsct.delete_tx_in_vec(txInVec)
}

export const deleteTxOutVec = (txOutVec: any): any => {
  return blsct.delete_tx_out_vec(txOutVec)
}

export const deleteCTx = (ctx: any): void => {
  return blsct.delete_ctx(ctx)
}

export const getCTxId = (ctx: any): string => {
  return blsct.get_ctx_id(ctx)
}

export const getCTxIns = (ctx: any): any => {
  return blsct.get_ctx_ins(ctx)
}

export const getCTxInAt = (ctxIns: any, i: number): any => {
  return blsct.get_ctx_in_at(ctxIns, i)
}

export const getCTxInsSize = (ctxIns: any): number => {
  return blsct.get_ctx_ins_size(ctxIns)
}

export const getCTxOuts = (ctx: any): any => {
  return blsct.get_ctx_outs(ctx)
}

export const getCTxOutAt = (ctxOuts: any, i: number): any => {
  return blsct.get_ctx_out_at(ctxOuts, i)
}

export const getCTxOutsSize = (ctxOuts: any): number => {
  return blsct.get_ctx_outs_size(ctxOuts)
}

// ctx serialization
export const serializeCTx = (ctx: any): string => {
  return blsct.serialize_ctx(ctx)
}

export const deserializeCTx = (hex: string): BlsctRetVal => {
  return blsct.deserialize_ctx(hex)
}

// ctx id
export const serializeCTxId = (ctxId: any): string => {
  return blsct.serialize_ctx_id(ctxId)
}

// signed transaction aggregation
export const createTxHexVec = (): any => {
  return blsct.create_tx_hex_vec()
}

export const addToTxHexVec = (txHexVec: any, txHex: string): void => {
  blsct.add_to_tx_hex_vec(txHexVec, txHex)
}

export const deleteTxHexVec = (txHexVec: any): void => {
  blsct.delete_tx_hex_vec(txHexVec)
}

export const aggregateTransactions = (txHexVec: any): BlsctRetVal => {
  return blsct.aggregate_transactions(txHexVec)
}

// ctx in
export const getCTxInPrevOutHash = (obj: any): any => {
  return blsct.get_ctx_in_prev_out_hash(obj)
}
export const getCTxInScriptSig = (obj: any): any => {
  return blsct.get_ctx_in_script_sig(obj)
}
export const getCTxInSequence = (obj: any): number => {
  return blsct.get_ctx_in_sequence(obj)
}
export const getCTxInScriptWitness = (obj: any): any => {
  return blsct.get_ctx_in_script_witness(obj)
}

// ctx out
export const getCTxOutValue = (obj: any): bigint => {
  return BigInt(blsct.get_ctx_out_value(obj))
}

export const getCTxOutScriptPubkey = (obj: any): any => {
  return blsct.get_ctx_out_script_pub_key(obj)
}

export const getCTxOutTokenId = (obj: any): any => {
  return blsct.get_ctx_out_token_id(obj)
}

export const getCTxOutVectorPredicate = (obj: any): BlsctRetVal => {
  return blsct.get_ctx_out_vector_predicate(obj)
}

// ctx out blsct data
export const getCTxOutBlindingKey = (obj: any): any => {
  return blsct.get_ctx_out_blinding_key(obj)
}

export const getCTxOutEphemeralKey = (obj: any): any => {
  return blsct.get_ctx_out_ephemeral_key(obj)
}

export const getCTxOutSpendingKey = (obj: any): any => {
  return blsct.get_ctx_out_spending_key(obj)
}

export const getCTxOutRangeProof = (obj: any): BlsctRetVal => {
  return blsct.get_ctx_out_range_proof(obj)
}

export const getCTxOutViewTag = (obj: any): number => {
  return blsct.get_ctx_out_view_tag(obj)
}

// double public key
export const deserializeDpk = (hex: string): BlsctRetVal => {
  return blsct.deserialize_dpk(hex)
}
export const genDoublePubKey = (pk1: any, pk2: any): BlsctRetVal => {
  return blsct.gen_double_pub_key(pk1, pk2)
}
export const genDpkWithKeysAcctAddr = (
  viewKey: any,
  spendingPubKey: any,
  account: number,
  address: number
): any => {
  return blsct.gen_dpk_with_keys_acct_addr(
    viewKey,
    spendingPubKey,
    account,
    address
  )
}
export const serializeDpk = (dpk: any): string => {
  return blsct.serialize_dpk(dpk)
}

// hash id
export const calcKeyId = (
  blindingPubKey: any,
  spendingPubKey: any,
  viewKey: any
): any => {
  return blsct.calc_key_id(blindingPubKey, spendingPubKey, viewKey)
}
export const deserializeKeyId = (hex: string): BlsctRetVal => {
  return blsct.deserialize_key_id(hex)
}
export const serializeKeyId = (hashId: any): string => {
  return blsct.serialize_key_id(hashId)
}

// misc
export const freeObj = (obj: any): void => {
  if (obj !== null && obj !== undefined) {
    blsct.free_obj(obj)
  }
}
export const hexToMallocedBuf = (hex: string): any => {
  return blsct.hex_to_malloced_buf(hex)
}
export const runGc = async (): Promise<void> => {
  if (typeof global.gc === 'function') {
    ;(global as any).gc()
    await new Promise(r =>
      setImmediate(r)
    )
  } else {
    console.warn('Garbage collector is not exposed. Run Node.js with --expose-gc to expose it.')
  }
}
export const toHex = (buf: any, size: number): string => {
  return blsct.buf_to_malloced_hex_c_str(buf, size)
}
export const getValueAsCStr = (rv: BlsctRetVal): string => {
  return blsct.cast_to_const_char_ptr(rv.value)
}

// out point
export const deserializeOutPoint = (hex: string): BlsctRetVal => {
  return blsct.deserialize_out_point(hex)
}
export const genOutPoint = (serCtxId: string): any => {
  return blsct.gen_out_point(serCtxId)
}
export const serializeOutPoint = (outPoint: any): string => {
  return blsct.serialize_out_point(outPoint)
}

// point
export const deserializePoint = (hex: string): BlsctRetVal => {
  return blsct.deserialize_point(hex)
}
export const genBasePoint = (): BlsctRetVal => {
  return blsct.gen_base_point()
}
export const genRandomPoint = (): BlsctRetVal => {
  return blsct.gen_random_point()
}
export const arePointEqual = (a: any, b: any): boolean => {
  return blsct.are_point_equal(a, b) !== 0
}
export const isValidPoint = (point: any): boolean => {
  return blsct.is_valid_point(point) !== 0
}
export const pointFromScalar = (scalar: any): any => {
  return blsct.point_from_scalar(scalar)
}
export const pointToStr = (point: any): any => {
  return blsct.point_to_str(point)
}
export const scalarMultiplyPoint = (point: any, scalar: any) => {
  return blsct.scalar_muliply_point(point, scalar) // TODO fix typo when the next navio-core is released
}
export const serializePoint = (point: any): string => {
  return blsct.serialize_point(point)
}

// priv spending key
export const calcPrivSpendingKey = (
  blindingPubKey: any,
  viewKey: any,
  spendingKey: any,
  account: number,
  address: number): any => {

  return blsct.calc_priv_spending_key(
    blindingPubKey,
    viewKey,
    spendingKey,
    account,
    address
  )
}

// public key
export const calcNonce = (blindingPubKey: any, viewKey: any): any => {
  return blsct.calc_nonce(blindingPubKey, viewKey)
}
export const genRandomPublicKey = (): BlsctRetVal => {
  return blsct.gen_random_public_key()
}
export const getPublicKeyPoint = (obj: any): any => {
  return blsct.get_public_key_point(obj)
}
export const pointToPublicKey = (point: any): any => {
  return blsct.point_to_public_key(point)
}
export const scalarToPubKey = (scalar: any): any => {
  return blsct.scalar_to_pub_key(scalar)
}

// range proof
export const addToRangeProofVec = (
  rangeProofs: any,
  rangeProof: any,
  rangeProofSize: number,
): void => {
  blsct.add_to_range_proof_vec(
    rangeProofs,
    rangeProof,
    rangeProofSize,
  )
}
export const addToAmountRecoveryReqVec = (
  reqs: any[],
  req: any,
): void => {
  blsct.add_to_amount_recovery_req_vec(reqs, req)
}
export const addToUint64Vec = (vec: any, n: number): void => {
  blsct.add_to_uint64_vec(vec, n)
}
export const buildRangeProof = (
  amounts: any,
  nonce: any,
  msg: any,
  token_id: any,
): BlsctRetVal => {
  return blsct.build_range_proof(
    amounts,
    nonce,
    msg,
    token_id,
  )
}
export const createAmountRecoveryReqVec = (): any => {
  return blsct.create_amount_recovery_req_vec()
}
export const createRangeProofVec = (): any => {
  return blsct.create_range_proof_vec()
}
export const createUint64Vec = (): any => {
  return blsct.create_uint64_vec()
}
export const deserializeRangeProof = (hex: string): BlsctRetVal => {
  assert(hex.length % 2 === 0)
  const objSize = hex.length / 2
  return blsct.deserialize_range_proof(hex, objSize)
}
export const deleteAmountRecoveryReqVec = (reqs: any): void => {
  blsct.delete_amount_recovery_req_vec(reqs)
}
export const deleteAmountsRetVal = (rv: BlsctAmountsRetVal): void => {
  blsct.free_amounts_ret_val(rv)
}
export const deleteRangeProofVec = (rangeProofs: any): void => {
  blsct.delete_range_proof_vec(rangeProofs)
}
export const deleteUint64Vec = (vec: any): any => {
  blsct.delete_uint64_vec(vec)
}
export const genAmountRecoveryReq = (
    rangeProof: any,
    rangeProofSize: number,
    nonce: any,
    tokenId: any,
): any => {
  return blsct.gen_amount_recovery_req(
    rangeProof,
    rangeProofSize,
    nonce,
    tokenId,
  )
}
export const getAmountRecoveryResultAmount = (
  req: any,
  i: number,
): bigint => {
  return BigInt(blsct.get_amount_recovery_result_amount(req, i))
}
export const getAmountRecoveryResultIsSucc = (
  req: any,
  i: number,
): boolean => {
  return blsct.get_amount_recovery_result_is_succ(req, i)
}
export const getAmountRecoveryResultMsg = (
  req: any,
  i: number,
): string => {
  return blsct.get_amount_recovery_result_msg(req, i)
}
export const getAmountRecoveryResultGamma = (
  req: any,
  i: number,
): any => {
  return blsct.get_amount_recovery_result_gamma_ptr(req, i)
}
export const getAmountRecoveryResultSize = (
  resVec: any,
): number => {
  return blsct.get_amount_recovery_result_size(resVec)
}
export const getRangeProof_A = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_A(rangeProof, rangeProofSize)
}
export const getRangeProof_alpha_hat = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_alpha_hat(rangeProof, rangeProofSize)
}
export const getRangeProof_A_wip = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_A_wip(rangeProof, rangeProofSize)
}
export const getRangeProof_B = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_B(rangeProof, rangeProofSize)
}
export const getRangeProof_delta_prime = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_delta_prime(rangeProof, rangeProofSize)
}
export const getRangeProof_r_prime = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_r_prime(rangeProof, rangeProofSize)
}
export const getRangeProof_s_prime = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_s_prime(rangeProof, rangeProofSize)
}
export const getRangeProof_tau_x = (rangeProof: any, rangeProofSize: number): any => {
  return blsct.get_range_proof_tau_x(rangeProof, rangeProofSize)
}
export const recoverAmount = (vec: any): BlsctAmountsRetVal => {
  return blsct.recover_amount(vec)
}
export const serializeRangeProof = (rangeProof: any, rangeProofSize: number): string => {
  return blsct.serialize_range_proof(rangeProof, rangeProofSize)
}
export const verifyRangeProofs = (rangeProofs: any[]): BlsctBoolRetVal => {
  return blsct.verify_range_proofs(rangeProofs)
}

// Verify range proofs under an explicit transcript version (e.g. taken from the
// containing tx's BLSCT_PROOF_V2_MARKER), rather than guessing v1-then-v2.
export const verifyRangeProofsWithTranscript = (
  rangeProofs: any[],
  transcriptV2: boolean,
): BlsctBoolRetVal => {
  return blsct.verify_range_proofs_with_transcript(rangeProofs, transcriptV2)
}

// scalar
export const deserializeScalar = (hex: string): BlsctRetVal => {
  return blsct.deserialize_scalar(hex)
}
export const genRandomScalar = (): BlsctRetVal => {
  return blsct.gen_random_scalar()
}
export const genScalar = (value: number): BlsctRetVal => {
  return blsct.gen_scalar(value)
}
export const areScalarEqual = (a: any, b: any): boolean => {
  return blsct.are_scalar_equal(a, b) !== 0
}
export const scalarToUint64 = (scalar: any): bigint => {
  return BigInt(blsct.scalar_to_uint64(scalar))
}
export const serializeScalar = (scalar: any): string => {
  return blsct.serialize_scalar(scalar)
}

// script
export const deserializeScript = (hex: string): any => {
  return blsct.deserialize_script(hex)
}
export const serializeScript = (script: any): string => {
  return blsct.serialize_script(script)
}

// signature
export const deserializeSignature = (hex: string): any => {
  return blsct.deserialize_signature(hex)
}
export const serializeSignature = (script: any): string => {
  return blsct.serialize_signature(script)
}
export const signMessage = (
  privKey: any,
  msg: string,
): any => {
  return blsct.sign_message(privKey, msg)
}
export const verifyMsgSig = (
  pubKey: any,
  msg: string,
  signature: any,
): boolean => {
  return blsct.verify_msg_sig(pubKey, msg, signature)
}

// sub addr
export const deriveSubAddress = (
  viewKey: any,
  spendingPubKey: any,
  subAddrId: any, 
): any => {
  return blsct.derive_sub_address(
    viewKey,
    spendingPubKey,
    subAddrId, 
  )
}
export const subAddrToDpk = (subAddr: any): any => {
  return blsct.sub_addr_to_dpk(subAddr)
}
export const deserializeSubAddr = (hex: string): any => {
  return blsct.deserialize_sub_addr(hex)
}
export const dpkToSubAddr = (dpk: any): BlsctRetVal => {
  return blsct.dpk_to_sub_addr(dpk)
}
export const serializeSubAddr = (subAddrId: any): string => {
  return blsct.serialize_sub_addr(subAddrId)
}

// sub addr id
export const deserializeSubAddrId = (hex: string): any => {
  return blsct.deserialize_sub_addr_id(hex)
}
export const genSubAddrId = (
  account: number,
  address: number,
): any => {
  return blsct.gen_sub_addr_id(account, address)
}
export const serializeSubAddrId = (subAddrId: any): string => {
  return blsct.serialize_sub_addr_id(subAddrId)
}

// token id
export const deserializeTokenId = (hex: string): BlsctRetVal => {
  return blsct.deserialize_token_id(hex)
}
export const genTokenId = (token: number): BlsctRetVal => {
  return blsct.gen_token_id(token)
}
export const genTokenIdWithSubid = (token: number, subid: number): BlsctRetVal => {
  return blsct.gen_token_id_with_token_and_subid(token, subid)
}
export const genDefaultTokenId = (): BlsctRetVal => {
  return blsct.gen_default_token_id()
}
export const getTokenIdSubid = (tokenId: any): bigint => {
  return BigInt(blsct.get_token_id_subid(tokenId))
}
export const getTokenIdToken = (tokenId: any): bigint => {
  return BigInt(blsct.get_token_id_token(tokenId))
}
export const serializeTokenId = (tokenId: any): string => {
  return blsct.serialize_token_id(tokenId)
}

// tx key
export const fromTxKeyToSpendingKey = (txKey: any): any => {
  return blsct.from_tx_key_to_spending_key(txKey)
}
export const fromTxKeyToViewKey = (txKey: any): any => {
  return blsct.from_tx_key_to_view_key(txKey)
}

// tx in
export const buildTxIn = (
  amount: number,
  gamma: any,
  spendingKey: any,
  tokenId: any,
  outPoint: any,
  isStakedCommitment: boolean,
  isRbf: boolean,
): any => {
  return blsct.build_tx_in(
    amount,
    gamma,
    spendingKey,
    tokenId,
    outPoint,
    isStakedCommitment,
    isRbf,
  )
}

export const getTxInAmount = (obj: any): bigint => {
  return BigInt(blsct.get_tx_in_amount(obj))
}

export const getTxInGamma = (obj: any): any => {
  return blsct.get_tx_in_gamma(obj)
}

export const getTxInSpendingKey = (obj: any): any => {
  return blsct.get_tx_in_spending_key(obj)
}

export const getTxInTokenId = (obj: any): any => {
  return blsct.get_tx_in_token_id(obj)
}

export const getTxInOutPoint = (obj: any): any => {
  return blsct.get_tx_in_out_point(obj)
}

export const getTxInStakedCommitment = (obj: any): boolean => {
  return blsct.get_tx_in_staked_commitment(obj)
}

export const getTxInRbf = (obj: any): boolean => {
  return blsct.get_tx_in_rbf(obj)
}

// tx out
export const buildTxOut = (
  subAddr: any,
  amount: number,
  memo: string,
  tokenId: any,
  outputType: TxOutputType,
  minStake: number,
  subtract_fee_from_amount: boolean,
  blinding_key: any,
): any => {
  let blsctOutputType
  switch (outputType) {
    case TxOutputType.Normal:
      blsctOutputType = blsct.Normal
      break

    case TxOutputType.StakedCommitment:
      blsctOutputType = blsct.StakedCommitment
      break

    default:
      throw new Error(`Unknown output type: ${outputType}`)
  }

  return blsct.build_tx_out(
    subAddr,
    amount,
    memo,
    tokenId,
    blsctOutputType,
    minStake,
    subtract_fee_from_amount,
    blinding_key,
  )
}

export const getTxOutDestination = (obj: any): any => {
  return blsct.get_tx_out_destination(obj)
}

export const getTxOutAmount = (obj: any): bigint => {
  return BigInt(blsct.get_tx_out_amount(obj))
}

export const getTxOutMemo = (obj: any): string => {
  return blsct.get_tx_out_memo(obj)
}

export const getTxOutTokenId = (obj: any): any => {
  return blsct.get_tx_out_token_id(obj)
}

export const getTxOutOutputType = (obj: any): TxOutputType => {
  const x = blsct.get_tx_out_output_type(obj)

  switch(x) {
    case blsct.Normal:
      return TxOutputType.Normal

    case blsct.StakedCommitment:
      return TxOutputType.StakedCommitment

    default:
      throw new Error(`Unknown TxOutputType ${x}`)
  }
}

export const getTxOutMinStake = (obj: any): bigint => {
  return BigInt(blsct.get_tx_out_min_stake(obj))
}

export const getTxOutSubtractFeeFromAmount = (obj: any): boolean => {
  return blsct.get_tx_out_subtract_fee_from_amount(obj)
}

export const getTxOutBlindingKey = (obj: any): any => {
  return blsct.get_tx_out_blinding_key(obj)
}

// Request/read the v2 range-proof transcript for an output. Set true when the
// output is for a transaction at or above the transcript-v2 activation height;
// any v2 output makes the assembled tx carry BLSCT_PROOF_V2_MARKER.
export const setTxOutTranscriptV2 = (obj: any, transcriptV2: boolean): void => {
  blsct.set_tx_out_transcript_v2(obj, transcriptV2)
}

export const getTxOutTranscriptV2 = (obj: any): boolean => {
  return blsct.get_tx_out_transcript_v2(obj)
}

// typecast
export const asString = (obj: string): any => {
  return blsct.cast_to_const_char_ptr(obj)
}
export const castToCTxIn = (obj: any): any => {
  return blsct.cast_to_ctx_in(obj)
}
export const castToCTxOut = (obj: any): any => {
  return blsct.cast_to_ctx_out(obj)
}
export const castToDpk = (obj: any): any => {
  return blsct.cast_to_dpk(obj)
}
export const castToKeyId = (obj: any): any => {
  return blsct.cast_to_key_id(obj)
}
export const castToOutPoint = (obj: any): any => {
  return blsct.cast_to_out_point(obj)
}
export const castToPoint = (obj: any): any => {
  return blsct.cast_to_point(obj)
}
export const castToPubKey = (obj: any): any => {
  return blsct.cast_to_pub_key(obj)
}
export const castToRangeProof = (obj: any): any => {
  return blsct.cast_to_range_proof(obj)
}
export const castToScalar = (obj: any): any => {
  return blsct.cast_to_scalar(obj)
}
export const castToScript = (obj: any): any => {
  return blsct.cast_to_script(obj)
}
export const castToSignature = (obj: any): any => {
  return blsct.cast_to_signature(obj)
}
export const castToSubAddr = (obj: any): any => {
  return blsct.cast_to_sub_addr(obj)
}
export const castToSubAddrId = (obj: any): any => {
  return blsct.cast_to_sub_addr_id(obj)
}
export const castToTokenId = (obj: any): any => {
  return blsct.cast_to_token_id(obj)
}
export const castToTxIn = (obj: any): any => {
  return blsct.cast_to_tx_in(obj)
}
export const castToTxOut = (obj: any): any => {
  return blsct.cast_to_tx_out(obj)
}
export const castToUint8_tPtr = (obj: any): any => {
  return blsct.cast_to_uint8_t_ptr(obj)
}
export const castToUint256 = (obj: any): any => {
  return blsct.cast_to_uint256(obj)
}
export const castToVectorPredicate = (obj: any): any => {
  return blsct.cast_to_vector_predicate(obj)
}

// generic string map helpers
export const createStringMap = (): any => {
  return blsct.create_string_map()
}
export const addToStringMap = (stringMap: any, key: string, value: string): void => {
  blsct.add_to_string_map(stringMap, key, value)
}
export const deleteStringMap = (stringMap: any): void => {
  blsct.delete_string_map(stringMap)
}
export const getStringMapSize = (stringMap: any): number => {
  return blsct.get_string_map_size(stringMap)
}
export const getStringMapKeyAt = (stringMap: any, i: number): string => {
  return blsct.get_string_map_key_at(stringMap, i)
}
export const getStringMapValueAt = (stringMap: any, i: number): string => {
  return blsct.get_string_map_value_at(stringMap, i)
}

// token info helpers
export const buildTokenInfo = (
  type: BlsctTokenType,
  publicKey: any,
  metadata: any,
  totalSupply: number
): BlsctRetVal => {
  return blsct.build_token_info(type, publicKey, metadata, totalSupply)
}
export const deleteTokenInfo = (tokenInfo: any): void => {
  blsct.delete_token_info(tokenInfo)
}
export const serializeTokenInfo = (tokenInfo: any): string => {
  return blsct.serialize_token_info(tokenInfo)
}
export const deserializeTokenInfo = (hex: string): BlsctRetVal => {
  return blsct.deserialize_token_info(hex)
}
export const getTokenInfoType = (tokenInfo: any): BlsctTokenType => {
  return blsct.get_token_info_type(tokenInfo)
}
export const getTokenInfoPublicKey = (tokenInfo: any): any => {
  return blsct.get_token_info_public_key(tokenInfo)
}
export const getTokenInfoTotalSupply = (tokenInfo: any): bigint => {
  return BigInt(blsct.get_token_info_total_supply(tokenInfo))
}
export const getTokenInfoMetadata = (tokenInfo: any): any => {
  return blsct.get_token_info_metadata(tokenInfo)
}

// collection token hash and token key derivation
export const calcCollectionTokenHash = (
  metadata: any,
  totalSupply: number
): BlsctRetVal => {
  return blsct.calc_collection_token_hash(metadata, totalSupply)
}
export const deriveCollectionTokenKey = (
  masterTokenKey: any,
  collectionTokenHash: any
): BlsctRetVal => {
  return blsct.derive_collection_token_key(masterTokenKey, collectionTokenHash)
}
export const deriveCollectionTokenPublicKey = (
  masterTokenKey: any,
  collectionTokenHash: any
): any => {
  return blsct.derive_collection_token_public_key(masterTokenKey, collectionTokenHash)
}

// vector predicate helpers
export const areVectorPredicateEqual = (
  a: any,
  aSize: number,
  b: any,
  bSize: number
): boolean => {
  return blsct.are_vector_predicate_equal(a, aSize, b, bSize) === 1
}
export const serializeVectorPredicate = (predicate: any, size: number): string => {
  return blsct.serialize_vector_predicate(predicate, size)
}
export const deserializeVectorPredicate = (hex: string): BlsctRetVal => {
  return blsct.deserialize_vector_predicate(hex)
}
export const getVectorPredicateType = (predicate: any, size: number): BlsctPredicateType => {
  return blsct.get_vector_predicate_type(predicate, size)
}
export const buildCreateTokenPredicate = (tokenInfo: any): BlsctRetVal => {
  return blsct.build_create_token_predicate(tokenInfo)
}
export const buildMintTokenPredicate = (
  tokenPublicKey: any,
  amount: number
): BlsctRetVal => {
  return blsct.build_mint_token_predicate(tokenPublicKey, amount)
}
export const buildMintNftPredicate = (
  tokenPublicKey: any,
  nftId: number,
  metadata: any
): BlsctRetVal => {
  return blsct.build_mint_nft_predicate(tokenPublicKey, nftId, metadata)
}
export const getCreateTokenPredicateTokenInfo = (predicate: any, size: number): BlsctRetVal => {
  return blsct.get_create_token_predicate_token_info(predicate, size)
}
export const getMintTokenPredicatePublicKey = (predicate: any, size: number): any => {
  return blsct.get_mint_token_predicate_public_key(predicate, size)
}
export const getMintTokenPredicateAmount = (predicate: any, size: number): bigint => {
  return BigInt(blsct.get_mint_token_predicate_amount(predicate, size))
}
export const getMintNftPredicatePublicKey = (predicate: any, size: number): any => {
  return blsct.get_mint_nft_predicate_public_key(predicate, size)
}
export const getMintNftPredicateNftId = (predicate: any, size: number): bigint => {
  return BigInt(blsct.get_mint_nft_predicate_nft_id(predicate, size))
}
export const getMintNftPredicateMetadata = (predicate: any, size: number): any => {
  return blsct.get_mint_nft_predicate_metadata(predicate, size)
}

// unsigned input/output/transaction helpers
export const buildUnsignedInput = (txIn: any): BlsctRetVal => {
  return blsct.build_unsigned_input(txIn)
}
export const deleteUnsignedInput = (unsignedInput: any): void => {
  blsct.delete_unsigned_input(unsignedInput)
}
export const serializeUnsignedInput = (unsignedInput: any): string => {
  return blsct.serialize_unsigned_input(unsignedInput)
}
export const deserializeUnsignedInput = (hex: string): BlsctRetVal => {
  return blsct.deserialize_unsigned_input(hex)
}

export const buildUnsignedOutput = (txOut: any): BlsctRetVal => {
  return blsct.build_unsigned_output(txOut)
}
export const buildUnsignedCreateTokenOutput = (
  tokenKey: any,
  tokenInfo: any
): BlsctRetVal => {
  return blsct.build_unsigned_create_token_output(tokenKey, tokenInfo)
}
export const buildUnsignedMintTokenOutput = (
  dest: any,
  amount: number,
  blindingKey: any,
  tokenKey: any,
  tokenPublicKey: any
): BlsctRetVal => {
  return blsct.build_unsigned_mint_token_output(dest, amount, blindingKey, tokenKey, tokenPublicKey)
}
// Builds the mint output's range proof under the requested BLSCT proof
// transcript. Pass transcriptV2=true at/above the network's transcript-v2
// activation height; a fungible mint output carries a range proof, so a v1
// mint output in a v2 transaction fails consensus (failed-rangeproof-check).
export const buildUnsignedMintTokenOutputWithTranscript = (
  dest: any,
  amount: number,
  blindingKey: any,
  tokenKey: any,
  tokenPublicKey: any,
  transcriptV2: boolean
): BlsctRetVal => {
  return blsct.build_unsigned_mint_token_output_with_transcript(
    dest, amount, blindingKey, tokenKey, tokenPublicKey, transcriptV2
  )
}
export const buildUnsignedMintNftOutput = (
  dest: any,
  blindingKey: any,
  tokenKey: any,
  tokenPublicKey: any,
  nftId: number,
  metadata: any
): BlsctRetVal => {
  return blsct.build_unsigned_mint_nft_output(dest, blindingKey, tokenKey, tokenPublicKey, nftId, metadata)
}
export const deleteUnsignedOutput = (unsignedOutput: any): void => {
  blsct.delete_unsigned_output(unsignedOutput)
}
export const serializeUnsignedOutput = (unsignedOutput: any): string => {
  return blsct.serialize_unsigned_output(unsignedOutput)
}
export const deserializeUnsignedOutput = (hex: string): BlsctRetVal => {
  return blsct.deserialize_unsigned_output(hex)
}

export const createUnsignedTransaction = (): any => {
  return blsct.create_unsigned_transaction()
}
export const addUnsignedTransactionInput = (unsignedTx: any, unsignedInput: any): void => {
  blsct.add_unsigned_transaction_input(unsignedTx, unsignedInput)
}
export const addUnsignedTransactionOutput = (unsignedTx: any, unsignedOutput: any): void => {
  blsct.add_unsigned_transaction_output(unsignedTx, unsignedOutput)
}
export const setUnsignedTransactionFee = (unsignedTx: any, fee: number): void => {
  blsct.set_unsigned_transaction_fee(unsignedTx, fee)
}
export const getUnsignedTransactionFee = (unsignedTx: any): bigint => {
  return BigInt(blsct.get_unsigned_transaction_fee(unsignedTx))
}
export const getUnsignedTransactionInputsSize = (unsignedTx: any): number => {
  return blsct.get_unsigned_transaction_inputs_size(unsignedTx)
}
export const getUnsignedTransactionOutputsSize = (unsignedTx: any): number => {
  return blsct.get_unsigned_transaction_outputs_size(unsignedTx)
}
export const deleteUnsignedTransaction = (unsignedTx: any): void => {
  blsct.delete_unsigned_transaction(unsignedTx)
}
export const serializeUnsignedTransaction = (unsignedTx: any): string => {
  return blsct.serialize_unsigned_transaction(unsignedTx)
}
export const deserializeUnsignedTransaction = (hex: string): BlsctRetVal => {
  return blsct.deserialize_unsigned_transaction(hex)
}
export const signUnsignedTransaction = (unsignedTx: any): BlsctRetVal => {
  return blsct.sign_unsigned_transaction(unsignedTx)
}

// stake delegation
export const setUnsignedOutputStakeDelegation = (
  unsignedOutput: any,
  dest: any,
  delegateKey: any,
  rewardAddress: string,
): boolean => {
  return blsct.set_unsigned_output_stake_delegation(unsignedOutput, dest, delegateKey, rewardAddress)
}
export const isStakeDelegationData = (data: any, dataLen: number): boolean => {
  return blsct.is_stake_delegation_data(data, dataLen)
}
export const buildStakeDelegationData = (
  value: number,
  gamma: any,
  rewardAddress: string,
  delegateKey: any,
  nonce: any,
): BlsctRetVal => {
  return blsct.build_stake_delegation_data(value, gamma, rewardAddress, delegateKey, nonce)
}
export const recoverStakeDelegationOwnerInfo = (data: any, dataLen: number, nonce: any): BlsctRetVal => {
  return blsct.recover_stake_delegation_owner_info(data, dataLen, nonce)
}
export const deleteStakeDelegationOwnerInfo = (ownerInfo: any): void => {
  blsct.delete_stake_delegation_owner_info(ownerInfo)
}
export const getStakeDelegationOwnerInfoDelegateKey = (ownerInfo: any): any => {
  return blsct.get_stake_delegation_owner_info_delegate_key(ownerInfo)
}
export const getStakeDelegationOwnerInfoRewardAddress = (ownerInfo: any): string => {
  return blsct.get_stake_delegation_owner_info_reward_address(ownerInfo)
}

// view tag
export const calcViewTag = (
  blindingPubKey: any,
  viewKey: any
): bigint => {
  return BigInt(blsct.calc_view_tag(blindingPubKey, viewKey))
}
