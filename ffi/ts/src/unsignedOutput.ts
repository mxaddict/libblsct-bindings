import {
  buildUnsignedCreateTokenOutput,
  buildUnsignedMintNftOutput,
  buildUnsignedMintTokenOutput,
  buildUnsignedMintTokenOutputWithTranscript,
  buildUnsignedOutput,
  deleteUnsignedOutput,
  deserializeUnsignedOutput,
  freeObj,
  serializeUnsignedOutput,
  setUnsignedOutputStakeDelegation,
} from './blsct'
import { PublicKey } from './keys/publicKey'
import { ManagedObj, unwrapPtr } from './managedObj'
import { Point } from './point'
import { Scalar } from './scalar'
import { freeNativeStringMap, makeNativeStringMap, MetadataMap } from './stringMapUtil'
import { SubAddr } from './subAddr'
import { TokenInfo } from './tokenInfo'
import { TxOut } from './txOut'

export class UnsignedOutput extends ManagedObj {
  constructor(obj: any) {
    const ptr = unwrapPtr(obj)
    super(ptr, () => deleteUnsignedOutput(ptr))
  }

  static fromTxOut(txOut: TxOut): UnsignedOutput {
    const rv = buildUnsignedOutput(txOut.value())
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to build unsigned output. Error code = ${rv.result}`)
    }
    const output = UnsignedOutput.fromObjAndSize(rv.value, rv.value_size)
    freeObj(rv)
    return output
  }

  static createTokenCollection(
    tokenKey: Scalar,
    tokenInfo: TokenInfo
  ): UnsignedOutput {
    const rv = buildUnsignedCreateTokenOutput(tokenKey.value(), tokenInfo.value())
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to build unsigned create-token output. Error code = ${rv.result}`)
    }
    const output = UnsignedOutput.fromObjAndSize(rv.value, rv.value_size)
    freeObj(rv)
    return output
  }

  /** Builds a fungible-token mint output.
   *
   * A mint output carries a range proof (its amount is committed), so it must
   * be built under the proof transcript of the transaction it goes into. Pass
   * `transcriptV2 = true` for a transaction at or above the network's
   * BLSCT proof transcript v2 activation height — the same flag as
   * {@link TxOut.setTranscriptV2}; a v1 mint output in a v2 transaction is
   * rejected by consensus with `failed-rangeproof-check`.
   */
  static mintToken(
    destination: SubAddr,
    amount: number,
    blindingKey: Scalar,
    tokenKey: Scalar,
    tokenPublicKey: PublicKey,
    transcriptV2: boolean = false
  ): UnsignedOutput {
    const rv = transcriptV2
      ? buildUnsignedMintTokenOutputWithTranscript(
          destination.value(),
          amount,
          blindingKey.value(),
          tokenKey.value(),
          tokenPublicKey.value(),
          true
        )
      : buildUnsignedMintTokenOutput(
          destination.value(),
          amount,
          blindingKey.value(),
          tokenKey.value(),
          tokenPublicKey.value()
        )
    if (rv.result !== 0) {
      freeObj(rv)
      throw new Error(`Failed to build unsigned mint-token output. Error code = ${rv.result}`)
    }
    const output = UnsignedOutput.fromObjAndSize(rv.value, rv.value_size)
    freeObj(rv)
    return output
  }

  static mintNft(
    destination: SubAddr,
    blindingKey: Scalar,
    tokenKey: Scalar,
    tokenPublicKey: PublicKey,
    nftId: number,
    metadata: MetadataMap
  ): UnsignedOutput {
    const metadataMap = makeNativeStringMap(metadata)
    try {
      const rv = buildUnsignedMintNftOutput(
        destination.value(),
        blindingKey.value(),
        tokenKey.value(),
        tokenPublicKey.value(),
        nftId,
        metadataMap
      )
      if (rv.result !== 0) {
        freeObj(rv)
        throw new Error(`Failed to build unsigned mint-NFT output. Error code = ${rv.result}`)
      }
      const output = UnsignedOutput.fromObjAndSize(rv.value, rv.value_size)
      freeObj(rv)
      return output
    } finally {
      freeNativeStringMap(metadataMap)
    }
  }

  /** Delegates this staked output to a third-party staker (cold staking):
   * attaches the encrypted delegation payload as the output's DATA predicate.
   * Call it before the transaction is signed; the predicate is covered by the
   * output's signature.
   * @param destination - The destination the output was built for; it is checked against the output's keys.
   * @param delegateKey - The staker's public key.
   * @param rewardAddress - Where the staker must pay the block rewards.
   * @throws If the output is not a default-token staked commitment, the
   * destination does not match, or the reward address is empty.
   */
  setStakeDelegation(
    destination: SubAddr,
    delegateKey: Point,
    rewardAddress: string
  ): void {
    if (!setUnsignedOutputStakeDelegation(this.value(), destination.value(), delegateKey.value(), rewardAddress)) {
      throw new Error('Failed to set stake delegation on the unsigned output')
    }
  }

  override value(): any {
    return this.obj
  }

  override serialize(): string {
    return serializeUnsignedOutput(this.value())
  }

  static deserialize(
    this: new (obj: any) => UnsignedOutput,
    hex: string
  ): UnsignedOutput {
    return UnsignedOutput._deserialize(hex, deserializeUnsignedOutput)
  }
}

