import {
  buildStakeDelegationData,
  castToUint8_tPtr,
  deleteStakeDelegationOwnerInfo,
  freeObj,
  getStakeDelegationOwnerInfoDelegateKey,
  getStakeDelegationOwnerInfoRewardAddress,
  hexToMallocedBuf,
  isStakeDelegationData,
  recoverStakeDelegationOwnerInfo,
  serializePoint,
  toHex,
} from './blsct'
import { Point } from './point'
import { Scalar } from './scalar'

/** Whom a delegated staked output is delegated to, as its owner sees it. */
export interface StakeDelegationOwnerInfo {
  /** The staker's public key the stake is delegated to. */
  delegateKey: Point
  /** Where the staker must pay the block rewards. */
  rewardAddress: string
}

const HEX_BYTES = /^(?:[0-9a-fA-F]{2})+$/

// libblsct parses hex without validating it, so reject anything that is not
// whole bytes of hex before handing it over.
const withDataBuf = <T>(dataHex: string, cb: (buf: any, len: number) => T): T => {
  if (!HEX_BYTES.test(dataHex)) {
    throw new Error('Stake delegation data must be a non-empty hex string of whole bytes')
  }
  const buf = hexToMallocedBuf(dataHex)
  try {
    return cb(buf, dataHex.length / 2)
  } finally {
    freeObj(buf)
  }
}

/** Builds a stake-delegation payload for a staked output whose commitment
 * opens to (`value`, `gamma`), ready to attach as the output's DATA predicate.
 * Prefer `UnsignedOutput.setStakeDelegation`, which takes the value, gamma and
 * nonce from the output itself.
 * @param value - The staked amount the output commits to.
 * @param gamma - The commitment's blinding factor.
 * @param rewardAddress - Where the staker must pay the block rewards.
 * @param delegateKey - The staker's public key.
 * @param nonce - The output's BLSCT nonce (destination view key times the output's blinding key).
 * @returns The payload as a hex string.
 */
export const buildStakeDelegationDataHex = (
  value: number,
  gamma: Scalar,
  rewardAddress: string,
  delegateKey: Point,
  nonce: Point,
): string => {
  const rv = buildStakeDelegationData(value, gamma.value(), rewardAddress, delegateKey.value(), nonce.value())
  if (rv.result !== 0) {
    freeObj(rv)
    throw new Error(`Failed to build stake delegation data. Error code = ${rv.result}`)
  }
  const dataHex = toHex(castToUint8_tPtr(rv.value), rv.value_size)
  freeObj(rv.value)
  freeObj(rv)
  return dataHex
}

/** Returns whether `dataHex`, the payload of a DATA predicate (not the
 * serialized predicate), looks like a stake-delegation payload. A cheap filter
 * to run before `parseStakeDelegationOwnerInfo` while syncing.
 */
export const isStakeDelegationDataHex = (dataHex: string): boolean => {
  if (dataHex === '') {
    return false
  }
  return withDataBuf(dataHex, (buf, len) => isStakeDelegationData(buf, len))
}

/** Recovers the staker key and reward address from a stake-delegation
 * payload, as the owner of the delegated output.
 * @param dataHex - The payload of the output's DATA predicate.
 * @param nonce - The output's BLSCT nonce: the output's blinding key times the owner's view key.
 * @returns The delegation the payload carries.
 * @throws If the payload is not a delegation payload or the nonce does not open it.
 */
export const parseStakeDelegationOwnerInfo = (
  dataHex: string,
  nonce: Point,
): StakeDelegationOwnerInfo => {
  return withDataBuf(dataHex, (buf, len) => {
    const rv = recoverStakeDelegationOwnerInfo(buf, len, nonce.value())
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to recover stake delegation owner info. Error code = ${rv.result}`)
    }
    const ownerInfo = rv.value
    try {
      // Both fields live inside ownerInfo, so copy them out before it is freed.
      return {
        delegateKey: Point.deserialize(serializePoint(getStakeDelegationOwnerInfoDelegateKey(ownerInfo))),
        rewardAddress: getStakeDelegationOwnerInfoRewardAddress(ownerInfo),
      }
    } finally {
      deleteStakeDelegationOwnerInfo(ownerInfo)
      freeObj(rv)
    }
  })
}
