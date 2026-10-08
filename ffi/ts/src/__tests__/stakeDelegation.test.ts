import { TxOutputType } from '../blsct'
import { PublicKey } from '../keys/publicKey'
import { Point } from '../point'
import { Scalar } from '../scalar'
import {
  buildStakeDelegationDataHex,
  isStakeDelegationDataHex,
  parseStakeDelegationOwnerInfo,
} from '../stakeDelegation'
import { SubAddr } from '../subAddr'
import { SubAddrId } from '../subAddrId'
import { TxOut } from '../txOut'
import { UnsignedOutput } from '../unsignedOutput'

const REWARD_ADDRESS = 'reward-address'
const STAKE = 1_000_000_000_000

const genDest = (): SubAddr =>
  SubAddr.generate(Scalar.random(), PublicKey.random(), SubAddrId.generate(0, 0))

const genOutput = (dest: SubAddr, outputType: TxOutputType): UnsignedOutput =>
  UnsignedOutput.fromTxOut(
    TxOut.generate(dest, STAKE, '', undefined, outputType, STAKE, false, Scalar.random())
  )

describe('stake delegation payload', () => {
  test('opens to its owner with the delegate key and reward address', () => {
    const delegateKey = Point.random()
    const nonce = Point.random()
    const dataHex = buildStakeDelegationDataHex(STAKE, Scalar.random(), REWARD_ADDRESS, delegateKey, nonce)

    expect(isStakeDelegationDataHex(dataHex)).toBe(true)
    const info = parseStakeDelegationOwnerInfo(dataHex, nonce)
    expect(info.delegateKey.equals(delegateKey)).toBe(true)
    expect(info.rewardAddress).toBe(REWARD_ADDRESS)
  })

  test('does not open with another nonce', () => {
    const dataHex = buildStakeDelegationDataHex(STAKE, Scalar.random(), REWARD_ADDRESS, Point.random(), Point.random())
    expect(() => parseStakeDelegationOwnerInfo(dataHex, Point.random())).toThrow()
  })

  test('other data is not a delegation payload', () => {
    expect(isStakeDelegationDataHex('00ff')).toBe(false)
    expect(isStakeDelegationDataHex('')).toBe(false)
    expect(() => parseStakeDelegationOwnerInfo('00ff', Point.random())).toThrow()
  })

  test('malformed hex is rejected before it reaches libblsct', () => {
    expect(() => isStakeDelegationDataHex('abc')).toThrow()
    expect(() => parseStakeDelegationOwnerInfo('zz', Point.random())).toThrow()
  })

  test('an empty reward address is refused', () => {
    expect(() =>
      buildStakeDelegationDataHex(STAKE, Scalar.random(), '', Point.random(), Point.random())
    ).toThrow()
  })
})

describe('UnsignedOutput.setStakeDelegation', () => {
  test('attaches the payload to a staked output', () => {
    const dest = genDest()
    const output = genOutput(dest, TxOutputType.StakedCommitment)
    const before = output.serialize()

    output.setStakeDelegation(dest, Point.random(), REWARD_ADDRESS)
    expect(output.serialize()).not.toBe(before)
  })

  test('refuses a normal output', () => {
    const dest = genDest()
    const output = genOutput(dest, TxOutputType.Normal)
    expect(() => output.setStakeDelegation(dest, Point.random(), REWARD_ADDRESS)).toThrow()
  })

  test('refuses a destination the output was not built for', () => {
    const output = genOutput(genDest(), TxOutputType.StakedCommitment)
    expect(() => output.setStakeDelegation(genDest(), Point.random(), REWARD_ADDRESS)).toThrow()
  })

  test('refuses an empty reward address', () => {
    const dest = genDest()
    const output = genOutput(dest, TxOutputType.StakedCommitment)
    expect(() => output.setStakeDelegation(dest, Point.random(), '')).toThrow()
  })
})
