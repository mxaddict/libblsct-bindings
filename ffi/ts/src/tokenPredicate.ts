import {
  BlsctPredicateType,
  buildCreateTokenPredicate as buildCreateTokenPredicateRaw,
  buildMintNftPredicate as buildMintNftPredicateRaw,
  buildMintTokenPredicate as buildMintTokenPredicateRaw,
  castToUint8_tPtr,
  castToVectorPredicate,
  deserializeVectorPredicate,
  freeObj,
  getCreateTokenPredicateTokenInfo as getCreateTokenPredicateTokenInfoRaw,
  getDataPredicateData as getDataPredicateDataRaw,
  getMintNftPredicateMetadata as getMintNftPredicateMetadataRaw,
  getMintNftPredicateNftId as getMintNftPredicateNftIdRaw,
  getMintNftPredicatePublicKey as getMintNftPredicatePublicKeyRaw,
  getMintTokenPredicateAmount as getMintTokenPredicateAmountRaw,
  getMintTokenPredicatePublicKey as getMintTokenPredicatePublicKeyRaw,
  getVectorPredicateType as getVectorPredicateTypeRaw,
  serializeVectorPredicate,
  toHex,
} from './blsct'
import { PublicKey } from './keys/publicKey'
import { freeNativeStringMap, makeNativeStringMap, MetadataMap, readNativeStringMap } from './stringMapUtil'
import { TokenInfo } from './tokenInfo'

const parsePredicateHex = <T>(
  predicateHex: string,
  cb: (predicate: any, size: number) => T
): T => {
  const rv = deserializeVectorPredicate(predicateHex)
  if (rv.result !== 0) {
    freeObj(rv)
    throw new Error(`Failed to deserialize vector predicate. Error code = ${rv.result}`)
  }

  const predicate = castToVectorPredicate(rv.value)
  try {
    return cb(predicate, rv.value_size)
  } finally {
    freeObj(predicate)
    freeObj(rv)
  }
}

export const buildCreateTokenPredicateHex = (tokenInfo: TokenInfo): string => {
  const rv = buildCreateTokenPredicateRaw(tokenInfo.value())
  if (rv.result !== 0) {
    freeObj(rv)
    throw new Error(`Failed to build create token predicate. Error code = ${rv.result}`)
  }
  const predicateHex = serializeVectorPredicate(castToVectorPredicate(rv.value), rv.value_size)
  freeObj(rv.value)
  freeObj(rv)
  return predicateHex
}

export const buildMintTokenPredicateHex = (
  tokenPublicKey: PublicKey,
  amount: number
): string => {
  const rv = buildMintTokenPredicateRaw(tokenPublicKey.value(), amount)
  if (rv.result !== 0) {
    freeObj(rv)
    throw new Error(`Failed to build mint token predicate. Error code = ${rv.result}`)
  }
  const predicateHex = serializeVectorPredicate(castToVectorPredicate(rv.value), rv.value_size)
  freeObj(rv.value)
  freeObj(rv)
  return predicateHex
}

export const buildMintNftPredicateHex = (
  tokenPublicKey: PublicKey,
  nftId: number,
  metadata: MetadataMap
): string => {
  const metadataMap = makeNativeStringMap(metadata)
  try {
    const rv = buildMintNftPredicateRaw(tokenPublicKey.value(), nftId, metadataMap)
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to build mint NFT predicate. Error code = ${rv.result}`)
    }
    const predicateHex = serializeVectorPredicate(castToVectorPredicate(rv.value), rv.value_size)
    freeObj(rv.value)
    freeObj(rv)
    return predicateHex
  } finally {
    freeNativeStringMap(metadataMap)
  }
}

export const getPredicateType = (predicateHex: string): BlsctPredicateType => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    return getVectorPredicateTypeRaw(predicate, size)
  })
}

export const parseCreateTokenPredicateTokenInfo = (predicateHex: string): TokenInfo => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    const rv = getCreateTokenPredicateTokenInfoRaw(predicate, size)
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to parse create token predicate. Error code = ${rv.result}`)
    }
    const info = TokenInfo.fromObj(rv.value)
    freeObj(rv)
    return info
  })
}

export const parseMintTokenPredicatePublicKey = (predicateHex: string): PublicKey => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    return PublicKey.fromObj(getMintTokenPredicatePublicKeyRaw(predicate, size))
  })
}

export const parseMintTokenPredicateAmount = (predicateHex: string): bigint => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    return getMintTokenPredicateAmountRaw(predicate, size)
  })
}

export const parseMintNftPredicatePublicKey = (predicateHex: string): PublicKey => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    return PublicKey.fromObj(getMintNftPredicatePublicKeyRaw(predicate, size))
  })
}

export const parseMintNftPredicateNftId = (predicateHex: string): bigint => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    return getMintNftPredicateNftIdRaw(predicate, size)
  })
}

export const parseMintNftPredicateMetadata = (predicateHex: string): MetadataMap => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    const nativeMap = getMintNftPredicateMetadataRaw(predicate, size)
    try {
      return readNativeStringMap(nativeMap)
    } finally {
      freeNativeStringMap(nativeMap)
    }
  })
}

/** Returns the payload of a DATA predicate as hex, without the operation
 * byte and length prefix that frame it in `predicateHex` (for example a
 * stake-delegation payload, see `parseStakeDelegationOwnerInfo`).
 * @throws If `predicateHex` is not a DATA predicate.
 */
export const parseDataPredicateData = (predicateHex: string): string => {
  return parsePredicateHex(predicateHex, (predicate, size) => {
    const rv = getDataPredicateDataRaw(predicate, size)
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to parse DATA predicate. Error code = ${rv.result}`)
    }
    const dataHex = rv.value_size === 0 ? '' : toHex(castToUint8_tPtr(rv.value), rv.value_size)
    freeObj(rv.value)
    freeObj(rv)
    return dataHex
  })
}
