import { createHash } from 'crypto'

import {
  BlsctPredicateType,
  CTx,
  CTxId,
  OutPoint,
  PublicKey,
  Scalar,
  SubAddr,
  SubAddrId,
  TokenId,
  TokenInfo,
  TokenType,
  TxIn,
  UnsignedInput,
  UnsignedOutput,
  UnsignedTransaction,
  buildCreateTokenPredicateHex,
  buildMintNftPredicateHex,
  buildMintTokenPredicateHex,
  calcCollectionTokenHashHex,
  deriveCollectionTokenKeyFromMaster,
  deriveCollectionTokenPublicKeyFromMaster,
  getPredicateType,
  parseCreateTokenPredicateTokenInfo,
  parseMintNftPredicateMetadata,
  parseMintNftPredicateNftId,
  parseMintNftPredicatePublicKey,
  parseMintTokenPredicateAmount,
  parseMintTokenPredicatePublicKey,
} from '../index'

const EXPECTED = {
  collectionHash: 'e6cd49c7addf6478cebd40ce4fd13d9681b049e5f76bf9faf8a136c31e9f4884',
  tokenKey: 'b48140b01fa1f7cc976bef952ed52c292230792bd0a0f7dd931986c6fae03a4',
  tokenPub: '893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe96',
  tokenInfoSer: '00893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe9602046e616d6510546f6b656e20436f6c6c656374696f6e0673796d626f6c03544f4b404b4c0000000000',
  nftInfoSer: '01893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe96020a636f6c6c656374696f6e0747656e657369730763726561746f72056e6176696f0000000000000000',
  createPredToken: '0000893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe9602046e616d6510546f6b656e20436f6c6c656374696f6e0673796d626f6c03544f4b404b4c0000000000',
  createPredNft: '0001893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe96020a636f6c6c656374696f6e0747656e657369730763726561746f72056e6176696f0000000000000000',
  mintTokenPred: '01893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe9640e2010000000000',
  mintNftPred: '02893b025f8b6e1213a35891faae194e05779b0121eb5d652695d2fdd97bf93d169ae82f54bbf0ddc8c4669c0db72dbe962a0000000000000003046e616d6508417274696661637406726172697479096c6567656e64617279037572690d697066733a2f2f516d48617368',
  unsignedInputHash: '906b86a8aa2fe82782cca2f674ad8e485a21cc4d5d3e63353a0e32c8bd526a94',
  unsignedMintNftOutHash: '0a4d553fa16de13df076c6e613d43c45c266810427764923bd26f35e9c863166',
  // The same output as serialized before navio-core appended UnsignedOutput's
  // transcript_v2 flag: everything but that final byte must be unchanged.
  unsignedMintNftOutHashBeforeTranscriptFlag: 'fceaf21b0390229f5eeb58490751429e1561614a2dcc35b910ae9407d32de873',
} as const

const COLLECTION_METADATA = { symbol: 'TOK', name: 'Token Collection' }
const COLLECTION_SUPPLY = 5_000_000
const NFT_METADATA = { name: 'Artifact', uri: 'ipfs://QmHash', rarity: 'legendary' }

const sha256Hex = (hex: string): string => {
  return createHash('sha256').update(hex, 'hex').digest('hex')
}

const makeUnsignedInput = (hexByte: string = '11'): UnsignedInput => {
  const ctxId = CTxId.deserialize(hexByte.repeat(32))
  const outPoint = OutPoint.generate(ctxId)
  const txIn = TxIn.generate(
    250000,
    new Scalar(100),
    new Scalar(101),
    TokenId.default(),
    outPoint,
    false,
    false,
  )
  return UnsignedInput.fromTxIn(txIn)
}

const makeDestination = (): SubAddr => {
  const viewKey = new Scalar(91)
  const spendPk = PublicKey.fromScalar(new Scalar(92))
  return SubAddr.generate(viewKey, spendPk, SubAddrId.generate(7, 9))
}

describe('Token and NFT create/mint APIs', () => {
  let tokenInfo: TokenInfo
  let nftInfo: TokenInfo
  let tokenPublicKey: PublicKey
  let tokenKey: Scalar
  let createPredicateTokenHex: string
  let mintTokenPredicateHex: string
  let mintNftPredicateHex: string
  let destination: SubAddr

  beforeAll(() => {
    const masterTokenKey = new Scalar(31337)
    const collectionHashHex = calcCollectionTokenHashHex(COLLECTION_METADATA, COLLECTION_SUPPLY)
    tokenKey = deriveCollectionTokenKeyFromMaster(masterTokenKey, collectionHashHex)
    tokenPublicKey = deriveCollectionTokenPublicKeyFromMaster(masterTokenKey, collectionHashHex)

    tokenInfo = TokenInfo.build(TokenType.Token, tokenPublicKey, COLLECTION_METADATA, COLLECTION_SUPPLY)
    nftInfo = TokenInfo.build(TokenType.Nft, tokenPublicKey, { creator: 'navio', collection: 'Genesis' }, 0)

    createPredicateTokenHex = buildCreateTokenPredicateHex(tokenInfo)
    mintTokenPredicateHex = buildMintTokenPredicateHex(tokenPublicKey, 123456)
    mintNftPredicateHex = buildMintNftPredicateHex(tokenPublicKey, 42, NFT_METADATA)
    destination = makeDestination()
  })

  test('collection hash, key derivation, and predicate serialization are deterministic', () => {
    const masterTokenKey = new Scalar(31337)
    const collectionHashHex = calcCollectionTokenHashHex(COLLECTION_METADATA, COLLECTION_SUPPLY)
    const derivedKey = deriveCollectionTokenKeyFromMaster(masterTokenKey, collectionHashHex)
    const derivedPub = deriveCollectionTokenPublicKeyFromMaster(masterTokenKey, collectionHashHex)

    expect(collectionHashHex).toBe(EXPECTED.collectionHash)
    expect(derivedKey.serialize()).toBe(EXPECTED.tokenKey)
    expect(derivedPub.serialize()).toBe(EXPECTED.tokenPub)
    expect(tokenInfo.serialize()).toBe(EXPECTED.tokenInfoSer)
    expect(nftInfo.serialize()).toBe(EXPECTED.nftInfoSer)

    const createNftPredicateHex = buildCreateTokenPredicateHex(nftInfo)
    expect(createPredicateTokenHex).toBe(EXPECTED.createPredToken)
    expect(createNftPredicateHex).toBe(EXPECTED.createPredNft)
    expect(mintTokenPredicateHex).toBe(EXPECTED.mintTokenPred)
    expect(mintNftPredicateHex).toBe(EXPECTED.mintNftPred)

    expect(getPredicateType(createPredicateTokenHex)).toBe(BlsctPredicateType.BlsctCreateTokenPredicateType)
    expect(getPredicateType(mintTokenPredicateHex)).toBe(BlsctPredicateType.BlsctMintTokenPredicateType)
    expect(getPredicateType(mintNftPredicateHex)).toBe(BlsctPredicateType.BlsctMintNftPredicateType)

    const parsedTokenInfo = parseCreateTokenPredicateTokenInfo(createPredicateTokenHex)
    expect(parsedTokenInfo.serialize()).toBe(tokenInfo.serialize())
    expect(parseMintTokenPredicatePublicKey(mintTokenPredicateHex).serialize()).toBe(tokenPublicKey.serialize())
    expect(parseMintTokenPredicateAmount(mintTokenPredicateHex)).toBe(123456n)
    expect(parseMintNftPredicatePublicKey(mintNftPredicateHex).serialize()).toBe(tokenPublicKey.serialize())
    expect(parseMintNftPredicateNftId(mintNftPredicateHex)).toBe(42n)
    expect(parseMintNftPredicateMetadata(mintNftPredicateHex)).toEqual(NFT_METADATA)
  })

  test('unsigned input/output serialization is core-compatible', () => {
    const unsignedInput = makeUnsignedInput('11')
    const createOut = UnsignedOutput.createTokenCollection(tokenKey, tokenInfo)
    const mintTokenOut = UnsignedOutput.mintToken(destination, 123456, new Scalar(777), tokenKey, tokenPublicKey)
    const mintNftOut = UnsignedOutput.mintNft(destination, new Scalar(888), tokenKey, tokenPublicKey, 42, NFT_METADATA)
    const createOutAgain = UnsignedOutput.createTokenCollection(tokenKey, tokenInfo)
    const mintTokenOutAgain = UnsignedOutput.mintToken(destination, 123456, new Scalar(777), tokenKey, tokenPublicKey)

    expect(sha256Hex(unsignedInput.serialize())).toBe(EXPECTED.unsignedInputHash)
    expect(sha256Hex(mintNftOut.serialize())).toBe(EXPECTED.unsignedMintNftOutHash)
    expect(mintNftOut.serialize().slice(-2)).toBe('00') // transcript_v2 = false
    expect(sha256Hex(mintNftOut.serialize().slice(0, -2))).toBe(EXPECTED.unsignedMintNftOutHashBeforeTranscriptFlag)
    expect(createOut.serialize()).toMatch(/^[0-9a-f]+$/)
    expect(mintTokenOut.serialize()).toMatch(/^[0-9a-f]+$/)
    expect(createOut.serialize()).toBe(createOut.serialize())
    expect(mintTokenOut.serialize()).toBe(mintTokenOut.serialize())
    expect(createOut.serialize()).not.toBe(createOutAgain.serialize())
    expect(mintTokenOut.serialize()).not.toBe(mintTokenOutAgain.serialize())
  })

  test('create-token transaction signs and carries a valid create predicate', () => {
    const unsignedTx = UnsignedTransaction.create()
    unsignedTx.addInput(makeUnsignedInput('21'))
    unsignedTx.addOutput(UnsignedOutput.createTokenCollection(tokenKey, tokenInfo))
    unsignedTx.setFee(1000)

    const signedTxHex = unsignedTx.sign()
    expect(signedTxHex).toMatch(/^[0-9a-f]+$/)
    expect(signedTxHex.length % 2).toBe(0)

    const ctx = CTx.deserialize(signedTxHex)
    expect(ctx.getCTxOuts().size()).toBe(2)
    const predicateHex = ctx.getCTxOuts().at(0).getVectorPredicate()
    expect(getPredicateType(predicateHex)).toBe(BlsctPredicateType.BlsctCreateTokenPredicateType)
    expect(parseCreateTokenPredicateTokenInfo(predicateHex).serialize()).toBe(tokenInfo.serialize())
  })

  test('mint-token transaction signs and carries a valid mint-token predicate', () => {
    const unsignedTx = UnsignedTransaction.create()
    unsignedTx.addInput(makeUnsignedInput('31'))
    unsignedTx.addOutput(UnsignedOutput.mintToken(destination, 123456, new Scalar(777), tokenKey, tokenPublicKey))
    unsignedTx.setFee(1000)

    const signedTxHex = unsignedTx.sign()
    expect(signedTxHex).toMatch(/^[0-9a-f]+$/)

    const ctx = CTx.deserialize(signedTxHex)
    expect(ctx.getCTxOuts().size()).toBe(2)
    const predicateHex = ctx.getCTxOuts().at(0).getVectorPredicate()
    expect(getPredicateType(predicateHex)).toBe(BlsctPredicateType.BlsctMintTokenPredicateType)
    expect(parseMintTokenPredicatePublicKey(predicateHex).serialize()).toBe(tokenPublicKey.serialize())
    expect(parseMintTokenPredicateAmount(predicateHex)).toBe(123456n)
  })

  test('mint-NFT transaction signs and carries a valid mint-NFT predicate', () => {
    const unsignedTx = UnsignedTransaction.create()
    unsignedTx.addInput(makeUnsignedInput('41'))
    unsignedTx.addOutput(UnsignedOutput.mintNft(destination, new Scalar(888), tokenKey, tokenPublicKey, 42, NFT_METADATA))
    unsignedTx.setFee(1000)

    const signedTxHex = unsignedTx.sign()
    expect(signedTxHex).toMatch(/^[0-9a-f]+$/)

    const ctx = CTx.deserialize(signedTxHex)
    expect(ctx.getCTxOuts().size()).toBe(2)
    const predicateHex = ctx.getCTxOuts().at(0).getVectorPredicate()
    expect(getPredicateType(predicateHex)).toBe(BlsctPredicateType.BlsctMintNftPredicateType)
    expect(parseMintNftPredicatePublicKey(predicateHex).serialize()).toBe(tokenPublicKey.serialize())
    expect(parseMintNftPredicateNftId(predicateHex)).toBe(42n)
    expect(parseMintNftPredicateMetadata(predicateHex)).toEqual(NFT_METADATA)
  })
})
