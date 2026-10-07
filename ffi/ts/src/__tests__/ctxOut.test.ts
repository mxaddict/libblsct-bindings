import { changeAddr, genCTx, randomHex } from './util'
import { CTx } from '../ctx'
import { CTxId } from '../ctxId'
import { CTxOut } from '../ctxOut'
import { DoublePublicKey } from '../keys/doublePublicKey'
import { OutPoint } from '../outPoint'
import { Point } from '../point'
import { PublicKey } from '../keys/publicKey'
import { Scalar } from '../scalar'
import { SubAddr } from '../subAddr'
import { TokenId } from '../tokenId'
import { TxIn } from '../txIn'
import { TxOut } from '../txOut'
import { CTX_ID_SIZE, TxOutputType } from '../blsct'

const genCTxOut = (): CTxOut => {
  const ctx = genCTx()
  const txOuts = ctx.getCTxOuts()
  return txOuts.at(0)
}

test('getValue', () => {
  const x = genCTxOut()
  x.getValue()
})

test('getScriptPubKey', () => {
  const x = genCTxOut()
  x.getScriptPubKey()
})

test('getTokenId', () => {
  const x = genCTxOut()
  x.getTokenId()
})

test('getVectorPredicate', () => {
  const x = genCTxOut()
  x.getVectorPredicate()
})

test('getSpendingKey', () => {
  const x = genCTxOut()
  x.getSpendingKey()
})

test('getEphemeralKey', () => {
  const x = genCTxOut()
  x.getEphemeralKey()
})

test('getBlindingKey', () => {
  const x = genCTxOut()
  x.getBlindingKey()
})

test('getRangeProof', () => {
  const x = genCTxOut()
  x.getRangeProof()
})

test('getViewTag', () => {
  const x = genCTxOut()
  x.getViewTag()
})

// The output keys are curve points (libblsct returns BlsctPoint). Read as a
// Scalar they could be created but not serialized: the native layer aborted.
test('spending, ephemeral and blinding keys are the points core derives', () => {
  const spendPk = PublicKey.random()
  const dest = SubAddr.fromDoublePublicKey(DoublePublicKey.fromViewAndSpendKeys(PublicKey.random(), spendPk))
  const blindingKey = Scalar.random()
  const txIn = TxIn.generate(410000, new Scalar(100), Scalar.random(), TokenId.default(), OutPoint.generate(CTxId.deserialize(randomHex(CTX_ID_SIZE))))
  const txOut = TxOut.generate(dest, 10000, 'keys', TokenId.default(), TxOutputType.Normal, 0, false, blindingKey)
  const outs = CTx.generate([txIn], [txOut], changeAddr()).getCTxOuts()

  // Every output, payment, change and fee alike, yields serializable points.
  for (let i = 0; i < outs.size(); ++i) {
    const o = outs.at(i)
    for (const key of [o.getSpendingKey(), o.getEphemeralKey(), o.getBlindingKey()]) {
      expect(key).toBeInstanceOf(Point)
      expect(key.serialize()).toMatch(/^[0-9a-f]{96}$/)
    }
  }

  // The payment output is the one whose ephemeral key is G * blindingKey;
  // core sets its blinding key to spendPk * blindingKey.
  const expectedEphemeral = Point.fromScalar(blindingKey).serialize()
  const payment = [...Array(outs.size()).keys()].map((i) => outs.at(i)).filter((o) => o.getEphemeralKey().serialize() === expectedEphemeral)
  expect(payment).toHaveLength(1)
  expect(payment[0]!.getBlindingKey().serialize()).toBe(spendPk.getPoint().mulScalar(blindingKey).serialize())
})
