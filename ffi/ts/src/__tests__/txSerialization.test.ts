import {
  CTX_ID_SIZE,
  TxOutputType,
} from '../blsct'

import { changeAddr, genCTx, randomHex } from './util'
import { CTx } from '../ctx'
import { CTxId } from '../ctxId'
import { OutPoint } from '../outPoint'
import { PublicKey } from '../keys/publicKey'
import { Scalar } from '../scalar'
import { SubAddr } from '../subAddr'
import { SubAddrId } from '../subAddrId'
import { TokenId } from '../tokenId'
import { TxIn } from '../txIn'
import { TxOut } from '../txOut'

const genTxIn = (
  amount: number = 123,
  gamma: number = 456,
  isStakedCommitment: boolean = false,
  isRbf: boolean = false,
): TxIn => {
  const spendingKey = Scalar.random()
  const tokenId = TokenId.default()
  const ctxIdHex = randomHex(CTX_ID_SIZE)
  const ctxId = CTxId.deserialize(ctxIdHex)
  const outPoint = OutPoint.generate(ctxId)

  return TxIn.generate(
    amount,
    new Scalar(gamma),
    spendingKey,
    tokenId,
    outPoint,
    isStakedCommitment,
    isRbf,
  )
}

const genTxOut = (
  amount: number = 12345,
  memo: string = 'navio',
  outputType: TxOutputType = TxOutputType.Normal,
  minStake: number = 0,
  subtractFee: boolean = false,
): TxOut => {
  const vk = Scalar.random()
  const spendingPk = PublicKey.random()
  const subAddrId = SubAddrId.generate(1, 2)
  const subAddr = SubAddr.generate(vk, spendingPk, subAddrId)
  const tokenId = TokenId.default()

  return TxOut.generate(
    subAddr,
    amount,
    memo,
    tokenId,
    outputType,
    minStake,
    subtractFee,
    Scalar.random(),
  )
}

// ---------------------------------------------------------------------------
// TxIn serialization
// ---------------------------------------------------------------------------

test('TxIn: round-trip serialization preserves bytes', () => {
  const a = genTxIn()
  const hex = a.serialize()
  const b = TxIn.deserialize(hex)
  expect(b.serialize()).toBe(hex)
})

test('TxIn: serialized hex is non-empty even-length lowercase hex', () => {
  const hex = genTxIn().serialize()
  expect(hex.length).toBeGreaterThan(0)
  expect(hex.length % 2).toBe(0)
  expect(hex).toMatch(/^[0-9a-f]+$/)
})

test('TxIn: round-trip preserves amount', () => {
  const a = genTxIn(9999)
  const b = TxIn.deserialize(a.serialize())
  expect(b.getAmount()).toBe(a.getAmount())
})

test('TxIn: round-trip preserves gamma', () => {
  const a = genTxIn(100, 789)
  const b = TxIn.deserialize(a.serialize())
  expect(b.getGamma().serialize()).toBe(a.getGamma().serialize())
})

test('TxIn: round-trip preserves spending key', () => {
  const a = genTxIn()
  const b = TxIn.deserialize(a.serialize())
  expect(b.getSpendingKey().serialize()).toBe(a.getSpendingKey().serialize())
})

test('TxIn: round-trip preserves token ID', () => {
  const a = genTxIn()
  const b = TxIn.deserialize(a.serialize())
  expect(b.getTokenId().serialize()).toBe(a.getTokenId().serialize())
})

test('TxIn: round-trip preserves outpoint', () => {
  const a = genTxIn()
  const b = TxIn.deserialize(a.serialize())
  expect(b.getOutPoint().serialize()).toBe(a.getOutPoint().serialize())
})

test('TxIn: round-trip preserves staked commitment flag', () => {
  const a = genTxIn(100, 100, true)
  const b = TxIn.deserialize(a.serialize())
  expect(b.getStakedCommitment()).toBe(true)
})

test('TxIn: round-trip preserves rbf flag', () => {
  const a = genTxIn(100, 100, false, true)
  const b = TxIn.deserialize(a.serialize())
  expect(b.getRbf()).toBe(true)
})

test('TxIn: different inputs produce different serializations', () => {
  const a = genTxIn(100)
  const b = genTxIn(200)
  expect(a.serialize()).not.toBe(b.serialize())
})

test('TxIn: clone produces identical serialization', () => {
  const a = genTxIn()
  const b = a.clone()
  expect(b.serialize()).toBe(a.serialize())
})

test('TxIn: double round-trip is stable', () => {
  const a = genTxIn()
  const hex1 = a.serialize()
  const hex2 = TxIn.deserialize(hex1).serialize()
  const hex3 = TxIn.deserialize(hex2).serialize()
  expect(hex1).toBe(hex2)
  expect(hex2).toBe(hex3)
})

test('TxIn: serialize is deterministic', () => {
  const a = genTxIn()
  expect(a.serialize()).toBe(a.serialize())
})

// ---------------------------------------------------------------------------
// TxOut serialization
// ---------------------------------------------------------------------------

test('TxOut: round-trip serialization preserves bytes', () => {
  const a = genTxOut()
  const hex = a.serialize()
  const b = TxOut.deserialize(hex)
  expect(b.serialize()).toBe(hex)
})

test('TxOut: serialized hex is non-empty even-length lowercase hex', () => {
  const hex = genTxOut().serialize()
  expect(hex.length).toBeGreaterThan(0)
  expect(hex.length % 2).toBe(0)
  expect(hex).toMatch(/^[0-9a-f]+$/)
})

test('TxOut: round-trip preserves amount', () => {
  const a = genTxOut(54321)
  const b = TxOut.deserialize(a.serialize())
  expect(b.getAmount()).toBe(a.getAmount())
})

test('TxOut: round-trip preserves memo', () => {
  const a = genTxOut(100, 'hello world')
  const b = TxOut.deserialize(a.serialize())
  expect(b.getMemo()).toBe(a.getMemo())
})

test('TxOut: round-trip preserves token ID', () => {
  const a = genTxOut()
  const b = TxOut.deserialize(a.serialize())
  expect(b.getTokenId().serialize()).toBe(a.getTokenId().serialize())
})

test('TxOut: round-trip preserves output type', () => {
  const a = genTxOut(100, 'navio', TxOutputType.Normal)
  const b = TxOut.deserialize(a.serialize())
  expect(b.getOutputType()).toBe(a.getOutputType())
})

test('TxOut: round-trip preserves min stake', () => {
  const a = genTxOut(100, 'navio', TxOutputType.Normal, 500)
  const b = TxOut.deserialize(a.serialize())
  expect(b.getMinStake()).toBe(a.getMinStake())
})

test('TxOut: round-trip preserves subtract-fee flag', () => {
  const a = genTxOut(100, 'navio', TxOutputType.Normal, 0, true)
  const b = TxOut.deserialize(a.serialize())
  expect(b.getSubtractFeeFromAmount()).toBe(true)
})

test('TxOut: round-trip preserves blinding key', () => {
  const a = genTxOut()
  const b = TxOut.deserialize(a.serialize())
  expect(b.getBlindingKey().serialize()).toBe(a.getBlindingKey().serialize())
})

test('TxOut: round-trip preserves destination', () => {
  const a = genTxOut()
  const b = TxOut.deserialize(a.serialize())
  expect(b.getDestination().serialize()).toBe(a.getDestination().serialize())
})

test('TxOut: different outputs produce different serializations', () => {
  const a = genTxOut(100)
  const b = genTxOut(200)
  expect(a.serialize()).not.toBe(b.serialize())
})

test('TxOut: clone produces identical serialization', () => {
  const a = genTxOut()
  const b = a.clone()
  expect(b.serialize()).toBe(a.serialize())
})

test('TxOut: double round-trip is stable', () => {
  const a = genTxOut()
  const hex1 = a.serialize()
  const hex2 = TxOut.deserialize(hex1).serialize()
  const hex3 = TxOut.deserialize(hex2).serialize()
  expect(hex1).toBe(hex2)
  expect(hex2).toBe(hex3)
})

test('TxOut: different memos produce different serializations', () => {
  const a = genTxOut(100, 'alpha')
  const b = genTxOut(100, 'bravo')
  expect(a.serialize()).not.toBe(b.serialize())
})

test('TxOut: serialize is deterministic', () => {
  const a = genTxOut()
  expect(a.serialize()).toBe(a.serialize())
})

// ---------------------------------------------------------------------------
// CTx serialization
// ---------------------------------------------------------------------------

test('CTx: serialize produces non-empty hex', () => {
  const ctx = genCTx()
  const hex = ctx.serialize()
  expect(hex.length).toBeGreaterThan(0)
  expect(hex.length % 2).toBe(0)
  expect(hex).toMatch(/^[0-9a-f]+$/)
})

test('CTx: round-trip serialization preserves bytes', () => {
  const a = genCTx()
  const hex = a.serialize()
  const b = CTx.deserialize(hex)
  expect(b.serialize()).toBe(hex)
})

test('CTx: round-trip preserves transaction ID', () => {
  const a = genCTx()
  const b = CTx.deserialize(a.serialize())
  expect(b.getCTxId().serialize()).toBe(a.getCTxId().serialize())
})

test('CTx: round-trip preserves input count', () => {
  const a = genCTx()
  const b = CTx.deserialize(a.serialize())
  expect(b.getCTxIns().size()).toBe(a.getCTxIns().size())
})

test('CTx: round-trip preserves output count', () => {
  const a = genCTx()
  const b = CTx.deserialize(a.serialize())
  expect(b.getCTxOuts().size()).toBe(a.getCTxOuts().size())
})

test('CTx: round-trip preserves input prevOutHash', () => {
  const a = genCTx()
  const b = CTx.deserialize(a.serialize())
  expect(b.getCTxIns().at(0).getPrevOutHash().serialize())
    .toBe(a.getCTxIns().at(0).getPrevOutHash().serialize())
})

test('CTx: round-trip preserves output scriptPubKey', () => {
  const a = genCTx()
  const b = CTx.deserialize(a.serialize())
  expect(b.getCTxOuts().at(0).getScriptPubKey().serialize())
    .toBe(a.getCTxOuts().at(0).getScriptPubKey().serialize())
})

test('CTx: different transactions produce different serializations', () => {
  const a = genCTx(10000)
  const b = genCTx(20000)
  expect(a.serialize()).not.toBe(b.serialize())
})

test('CTx: double round-trip is stable', () => {
  const a = genCTx()
  const hex1 = a.serialize()
  const hex2 = CTx.deserialize(hex1).serialize()
  const hex3 = CTx.deserialize(hex2).serialize()
  expect(hex1).toBe(hex2)
  expect(hex2).toBe(hex3)
})

test('CTx: serialize is deterministic', () => {
  const ctx = genCTx()
  expect(ctx.serialize()).toBe(ctx.serialize())
})

test('CTx: full end-to-end round-trip with field verification', () => {
  const blindingKey = Scalar.random()
  const outAmount = 50000

  const ctx = genCTx(outAmount, PublicKey.random(), blindingKey, 'e2e-test')
  const hex = ctx.serialize()
  const restored = CTx.deserialize(hex)

  expect(restored.getCTxId().serialize()).toBe(ctx.getCTxId().serialize())

  const origIns = ctx.getCTxIns()
  const restoredIns = restored.getCTxIns()
  expect(restoredIns.size()).toBe(origIns.size())
  for (let i = 0; i < origIns.size(); i++) {
    expect(restoredIns.at(i).getPrevOutHash().serialize())
      .toBe(origIns.at(i).getPrevOutHash().serialize())
    expect(restoredIns.at(i).getSequence()).toBe(origIns.at(i).getSequence())
  }

  const origOuts = ctx.getCTxOuts()
  const restoredOuts = restored.getCTxOuts()
  expect(restoredOuts.size()).toBe(origOuts.size())
  for (let i = 0; i < origOuts.size(); i++) {
    expect(restoredOuts.at(i).getValue()).toBe(origOuts.at(i).getValue())
    expect(restoredOuts.at(i).getScriptPubKey().serialize())
      .toBe(origOuts.at(i).getScriptPubKey().serialize())
  }
})

// ---------------------------------------------------------------------------
// CTx with multiple inputs and outputs
// ---------------------------------------------------------------------------

test('CTx: serialize with multiple inputs', () => {
  const defaultFee = 200000
  const outAmount = 10000
  const tokenId = TokenId.default()

  const txIns = [1, 2].map(() => {
    const ctxId = CTxId.deserialize(randomHex(CTX_ID_SIZE))
    const outPoint = OutPoint.generate(ctxId)
    return TxIn.generate(
      outAmount + 3 * defaultFee,
      new Scalar(100),
      Scalar.random(),
      tokenId,
      outPoint,
    )
  })

  const vk = Scalar.random()
  const spendingPk = PublicKey.random()
  const subAddrId = SubAddrId.generate(0, 0)
  const subAddr = SubAddr.generate(vk, spendingPk, subAddrId)
  const txOut = TxOut.generate(
    subAddr,
    outAmount,
    'multi-in',
    tokenId,
    TxOutputType.Normal,
    0,
    false,
    Scalar.random(),
  )

  const ctx = CTx.generate(txIns, [txOut], changeAddr())
  const hex = ctx.serialize()
  const restored = CTx.deserialize(hex)

  expect(restored.serialize()).toBe(hex)
  expect(restored.getCTxIns().size()).toBe(ctx.getCTxIns().size())
  expect(restored.getCTxOuts().size()).toBe(ctx.getCTxOuts().size())
})

test('CTx: serialize with multiple outputs', () => {
  const defaultFee = 200000
  const outAmount = 10000
  const tokenId = TokenId.default()

  const ctxId = CTxId.deserialize(randomHex(CTX_ID_SIZE))
  const outPoint = OutPoint.generate(ctxId)
  const txIn = TxIn.generate(
    outAmount * 2 + 3 * defaultFee,
    new Scalar(100),
    Scalar.random(),
    tokenId,
    outPoint,
  )

  const txOuts = [1, 2].map((i) => {
    const vk = Scalar.random()
    const spendingPk = PublicKey.random()
    const subAddrId = SubAddrId.generate(0, i)
    const subAddr = SubAddr.generate(vk, spendingPk, subAddrId)
    return TxOut.generate(
      subAddr,
      outAmount,
      `out-${i}`,
      tokenId,
      TxOutputType.Normal,
      0,
      false,
      Scalar.random(),
    )
  })

  const ctx = CTx.generate([txIn], txOuts, changeAddr())
  const hex = ctx.serialize()
  const restored = CTx.deserialize(hex)

  expect(restored.serialize()).toBe(hex)
  expect(restored.getCTxIns().size()).toBe(1)
  expect(restored.getCTxOuts().size()).toBeGreaterThanOrEqual(2)
})
