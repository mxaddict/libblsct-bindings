import { BlsctPredicateType, TxOutputType } from '../blsct'
import { CTx } from '../ctx'
import { CTxId } from '../ctxId'
import { PublicKey } from '../keys/publicKey'
import { OutPoint } from '../outPoint'
import { Point } from '../point'
import { Scalar } from '../scalar'
import {
  buildStakeDelegationDataHex,
  isStakeDelegationDataHex,
  parseStakeDelegationOwnerInfo,
} from '../stakeDelegation'
import { SubAddr } from '../subAddr'
import { SubAddrId } from '../subAddrId'
import { TokenId } from '../tokenId'
import {
  buildMintTokenPredicateHex,
  getPredicateType,
  parseDataPredicateData,
} from '../tokenPredicate'
import { TxIn } from '../txIn'
import { TxOut } from '../txOut'
import { UnsignedInput } from '../unsignedInput'
import { UnsignedOutput } from '../unsignedOutput'
import { UnsignedTransaction } from '../unsignedTransaction'

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

describe('cold staking end to end', () => {
  test('the owner recovers the delegation from the signed transaction', () => {
    const viewKey = Scalar.random()
    const dest = SubAddr.generate(viewKey, PublicKey.random(), SubAddrId.generate(0, 0))
    const delegateKey = Point.random()
    const fee = 1000

    const output = genOutput(dest, TxOutputType.StakedCommitment)
    output.setStakeDelegation(dest, delegateKey, REWARD_ADDRESS)
    const outPoint = OutPoint.generate(CTxId.deserialize('51'.repeat(32)))
    const txIn = TxIn.generate(STAKE + fee, new Scalar(100), new Scalar(101), TokenId.default(), outPoint)
    const unsignedTx = UnsignedTransaction.create()
    unsignedTx.addInput(UnsignedInput.fromTxIn(txIn))
    unsignedTx.addOutput(output)
    unsignedTx.setFee(fee)
    const ctx = CTx.deserialize(unsignedTx.sign())

    // Scan the outputs as a syncing wallet would.
    const outs = ctx.getCTxOuts()
    const delegated = Array.from({ length: outs.size() }, (_, i) => outs.at(i)).filter(out => {
      const predicateHex = out.getVectorPredicate()
      return predicateHex !== '' && getPredicateType(predicateHex) === BlsctPredicateType.BlsctDataPredicateType
    })
    expect(delegated).toHaveLength(1)
    const dataHex = parseDataPredicateData(delegated[0].getVectorPredicate())
    expect(isStakeDelegationDataHex(dataHex)).toBe(true)

    // The owner's nonce: the output's blinding key times the view key.
    const nonce = PublicKey.fromPoint(delegated[0].getBlindingKey()).generateNonce(viewKey).getPoint()
    const info = parseStakeDelegationOwnerInfo(dataHex, nonce)
    expect(info.delegateKey.equals(delegateKey)).toBe(true)
    expect(info.rewardAddress).toBe(REWARD_ADDRESS)
  })

  test('parseDataPredicateData refuses a predicate that is not DATA', () => {
    const tokenPublicKey = PublicKey.random()
    expect(() => parseDataPredicateData(buildMintTokenPredicateHex(tokenPublicKey, 5))).toThrow()
  })
})
