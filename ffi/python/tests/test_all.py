from blsct import (
  Address,
  AddressEncoding,
  AmountRecoveryReq,
  Chain,
  ChildKey,
  CTx,
  CTxId,
  DoublePublicKey,
  get_chain,
  HashId,
  OutPoint,
  Point,
  PrivSpendingKey,
  PublicKey,
  RangeProof,
  Scalar,
  set_chain,
  Signature,
  SubAddr,
  SubAddrId,
  TokenId,
  TxIn,
  TxOut,
  TxOutputType,
  TxKey,
  ViewTag,
)

import secrets

def test_chain():
  chains = [Chain.Mainnet, Chain.Testnet, Chain.Signet, Chain.Regtest]
  for exp_chain in chains:
    set_chain(exp_chain)
    act_chain = get_chain()
    assert exp_chain == act_chain, "Chain set/get are not working as expected"
    
  set_chain(Chain.Mainnet)  # reset to mainnet

def test_scalar():
  s1 = Scalar.random()
  print(s1)
  print(f"Scalar({s1.serialize()})")

  s2 = Scalar.random()
  assert(s1 != s2), "Random scalars should not be equal"
  assert(s1 == s1), "The same scalar should be equal"
  assert(s2 == s2), "The same scalar should be equal"

  s3 = Scalar.deserialize(s1.serialize())
  assert(s1 == s3), "Deserializing serialized Scalar should produce the original Scalar"

def test_point():
  p1 = Point.random()
  print(p1)

  p2 = Point.random()
  assert(p1 != p2), "Random Points should not be equal"
  assert(p1 == p1), "The same Point should be equal"
  assert(p2 == p2), "The same Point should be equal"

  p3 = Point.deserialize(p1.serialize())
  assert(p1 == p3), "Deserializing serialized Point should produce the original Point"

  p4 = Point.base()
  assert p4.is_valid(), "Base Point should be valid"

def test_public_key():
  pk1 = PublicKey.random()
  print(pk1)

  pk2 = PublicKey.random()
  assert(pk1 != pk2), "Random PublicKey should not be equal"
  assert(pk1 == pk1), "The same PublicKey should be equal"
  assert(pk2 == pk2), "The same PublicKey should be equal"

  pk3 = PublicKey.deserialize(pk1.serialize())
  assert(pk1 == pk3), "Deserializing serialized value should produce the original value"

def test_double_public_key():
  view_key = PublicKey()
  spend_key = PublicKey()
  dpk = DoublePublicKey.from_view_and_spend_keys(view_key, spend_key)
  print(dpk)

  with DoublePublicKey.from_view_and_spend_keys(PublicKey.random(), PublicKey.random()) as dpk:
    print(dpk)

def test_address():
  view_key = PublicKey()
  spend_key = PublicKey()
  dpk = DoublePublicKey.from_view_and_spend_keys(view_key, spend_key)

  enc_addr = Address.encode(dpk, AddressEncoding.Bech32)
  print(f"Address: {enc_addr}")

  dec_dpk = Address.decode(enc_addr)
  print(f"Decoded Address: {dec_dpk}")

  assert enc_addr == Address.encode(dec_dpk, AddressEncoding.Bech32), "Address encoding/decoding not working"

def test_token_id():
  token_id_1 = TokenId()
  print(token_id_1)

  token_id_2 = TokenId.from_token(123)
  print(token_id_2)

  token_id_3 = TokenId.from_token_and_subid(123, 456)
  print(token_id_3)

  assert(token_id_3.token() == 123)
  assert(token_id_3.subid() == 456)

def test_range_proof():
  nonce1 = Point()
  token_id_1 = TokenId()

  rp1 = RangeProof([456], nonce1, 'navcoin', token_id_1)
  assert(RangeProof.verify_proofs([rp1]) == True)

  req1 = AmountRecoveryReq(rp1, nonce1)
  rec_res1 = RangeProof.recover_amounts([req1])
  for i, x in enumerate(rec_res1):
    print(f"Recovered amount {i}: {x}")

  assert(rec_res1[0].is_succ == True)
  assert(rec_res1[0].message == "navcoin")
  assert(rec_res1[0].amount == 456)

  token_id_2 = TokenId.from_token(777)
  rp2 = RangeProof([789], nonce1, 'fungible', token_id_2)
  req2 = AmountRecoveryReq(rp2, nonce1, token_id_2)
  rec_res2 = RangeProof.recover_amounts([req2])
  assert(rec_res2[0].is_succ == True)
  assert(rec_res2[0].amount == 789)
  assert(rec_res2[0].message == "fungible")

  token_id_3 = TokenId.from_token_and_subid(777, 42)
  rp3 = RangeProof([1], nonce1, 'nft', token_id_3)
  req3 = AmountRecoveryReq(rp3, nonce1, token_id_3)
  rec_res3 = RangeProof.recover_amounts([req3])
  assert(rec_res3[0].is_succ == True)
  assert(rec_res3[0].amount == 1)
  assert(rec_res3[0].message == "nft")

def test_sig_gen_verify():
  msg = "navio"
  priv_key = Scalar.random()
  sig = Signature(priv_key, msg)
  print(f"Signature {sig}")

  pub_key = PublicKey.from_scalar(priv_key)
  is_sig_valid = sig.verify(msg, pub_key)
  print(f"sig verification: {is_sig_valid}")
  assert(is_sig_valid == True)

def test_key_derivation():
  seed = Scalar()
  print(f"Seed: {seed}")

  child_key = ChildKey(seed)
  print(f"ChildKey: {child_key.serialize()}")

  blinding_key = child_key.to_blinding_key()
  print(f"BlindingKey: {blinding_key.serialize()}")

  token_key = child_key.to_token_key()
  print(f"TokenKey: {token_key.serialize()}")

  tx_key = child_key.to_tx_key()
  print(f"TxKey: {tx_key.serialize()}")

  view_key = tx_key.to_view_key()
  print(f"ViewKey: {view_key.serialize()}")

  spending_key = tx_key.to_spending_key()
  print(f"SpendingKey: {spending_key.serialize()}")

  blinding_pub_key = PublicKey.from_scalar(blinding_key)
  print(f"blinding_pub_key: {blinding_pub_key}")

  account = 123
  address = 456

  priv_spending_key = PrivSpendingKey(
    blinding_pub_key,
    view_key,
    spending_key,
    account,
    address,
  )
  print(f"priv_spending_key: {priv_spending_key.serialize()}")

  view_tag = ViewTag(blinding_pub_key, view_key)
  print(f"view_tag: {view_tag}")

  spending_pub_key = PublicKey.from_scalar(spending_key)
  print(f"spending_pub_key: {spending_pub_key}")

  hash_id = HashId(
    blinding_pub_key,
    spending_pub_key,
    view_key,
  )
  print(f"hash_id: {hash_id}")

  nonce = blinding_pub_key.generate_nonce(view_key)
  print(f"nonce: {nonce}")

  sub_addr_id = SubAddrId(account, address)
  print(f"sub_addr_id: {sub_addr_id}")

  sub_addr = SubAddr(view_key, spending_pub_key, sub_addr_id)
  print(f"sub_addr: {sub_addr}")

  dpk = DoublePublicKey.from_keys_acct_addr(
    view_key,
    spending_pub_key,
    account,
    address,
  )
  print(f"dpk: {dpk}")

  dpk2 = sub_addr.to_double_public_key()
  print(f"dpk from sub_addr: {dpk2}")

  # test also direct instantiation
  TxKey()
  ChildKey(Scalar())
  DoublePublicKey()
  PrivSpendingKey(PublicKey(), Scalar(), Scalar(), 1, 2)
  PublicKey()
  ViewTag(PublicKey(), Scalar())

def test_tx():
  num_tx_in = 1
  num_tx_out = 1
  default_fee = 200000
  fee = (num_tx_in + num_tx_out) * default_fee
  out_amount = 10000
  in_amount = fee + out_amount
  out_amount = out_amount
  message = 'space_x'

  # tx in
  ctx_id = CTxId.deserialize(secrets.token_hex(32))
  print(f"ctx_id: {ctx_id}")

  gamma = 100
  spending_key = Scalar(12)
  token_id = TokenId()
  out_point = OutPoint(ctx_id)
  tx_in = TxIn(
    in_amount,
    gamma,
    spending_key,
    token_id,
    out_point,
  )
  print(f"tx_in.amount: {tx_in.get_amount()}")
  print(f"tx_in.gamma: {tx_in.get_gamma()}")
  print(f"tx_in.spending_key: {tx_in.get_spending_key()}")
  print(f"tx_in.token_id: {tx_in.get_token_id()}")
  print(f"tx_in.out_point: {tx_in.get_out_point()}")
  print(f"tx_in.staked_commitment: {tx_in.get_staked_commitment()}")
  print(f"tx_in.rbf: {tx_in.get_rbf()}")

  # tx out
  view_key = PublicKey()
  spend_key = PublicKey()
  dpk = DoublePublicKey.from_view_and_spend_keys(view_key, spend_key)
  sub_addr = SubAddr.from_double_public_key(dpk)
  blinding_key = Scalar.random()

  tx_out = TxOut(
    sub_addr,
    out_amount,
    message,
    TokenId(),
    "Normal",
    0,
    False,
    blinding_key,
  )
  print(f"tx_out.destination: {tx_out.get_destination()}")
  print(f"tx_out.amount: {tx_out.get_amount()}")
  print(f"tx_out.memo: {tx_out.get_memo()}")
  print(f"tx_out.token_id: {tx_out.get_token_id()}")
  print(f"tx_out.min_stake: {tx_out.get_min_stake()}")
  print(f"tx_out.subtract_fee_from_amount: {tx_out.get_subtract_fee_from_amount()}")
  print(f"tx_out.blinding_key: {tx_out.get_blinding_key()}")

  # tx
  # The fee is size-based, so the input over-funds it; the remainder is
  # change, which libblsct only pays to an address someone owns.
  change_addr = SubAddr.from_double_public_key(
    DoublePublicKey.from_view_and_spend_keys(PublicKey(), PublicKey())
  )
  ctx = CTx(
    [tx_in],
    [tx_out],
    change_addr,
  )

  ctx_id = ctx.get_ctx_id()
  print(f"ctx_id: {ctx_id}")

  ctx_hex = ctx.serialize()
  print(f"ctx_hex: {ctx_hex}")

  print("Deserializing...")
  ctx2 = CTx.deserialize(ctx_hex)
  print(f"Deserialized {ctx2}")

  ctx2_hex = ctx2.serialize()
  print(f"ctx2_hex: {ctx2_hex}")

  assert ctx_hex == ctx2_hex 

  deser_ctx_id = ctx2.get_ctx_id()
  print(f"ctx_id (deser): {deser_ctx_id}")

  ctx_ins = ctx2.get_ctx_ins()
  print(f"# of ctx_ins: {ctx_ins.size()}")

  ctx_outs = ctx2.get_ctx_outs()
  print(f"# of ctx_outs: {ctx_outs.size()}")

  print("<ctx in>")
  for ctx_in in ctx_ins: 
    print(f"prev_out_hash: {ctx_in.get_prev_out_hash()}")
    print(f"scipt_sig: {ctx_in.get_script_sig()}")
    print(f"sequence: {ctx_in.get_sequence()}")
    print(f"scipt_witness: {ctx_in.get_script_witness()}")

  print(f"<ctx out>")
  for ctx_out in ctx_outs:
    print(f"value: {ctx_out.get_value()}")
    print(f"script_pub_key: {ctx_out.get_script_pub_key()}")
    print(f"token_id: token={ctx_out.get_token_id().token()}, subid={ctx_out.get_token_id().subid()}")

    # blsct data
    print(f"spending_key: {ctx_out.get_spending_key()}")
    print(f"ephemeral_key: {ctx_out.get_ephemeral_key()}")
    print(f"blinding_key: {ctx_out.get_blinding_key()}")
    print(f"view_tag: {ctx_out.get_view_tag()}")

    rp = ctx_out.get_range_proof()
    print(f"range_proof.A: {rp.get_A().serialize()}")
    print(f"range_proof.A: {rp.get_A_wip().serialize()}")
    print(f"range_proof.B: {rp.get_B().serialize()}")
    print(f"range_Proof.r_prime: {rp.get_r_prime()}")
    print(f"range_proof.s_prime: {rp.get_s_prime()}")
    print(f"range_proof.delta_prime: {rp.get_delta_prime()}")
    print(f"range_proof.alpha_hat: {rp.get_alpha_hat()}")
    print(f"range_proof.tau_x: {rp.get_tau_x()}")

  # test amount recovery
  nonce = view_key.get_point().scalar_multiply(blinding_key)  

  # Core shuffles the outputs, so find the payment by its ephemeral key
  # (G * blinding_key) rather than assuming it comes first.
  expected_ephemeral = Point.from_scalar(blinding_key).serialize()
  payment = [o for o in ctx_outs if o.get_ephemeral_key().serialize() == expected_ephemeral]
  assert len(payment) == 1
  rp = payment[0].get_range_proof()
  req = AmountRecoveryReq(rp, nonce)
  amounts = RangeProof.recover_amounts([req])

  assert len(amounts) == 1
  assert amounts[0].is_succ == True
  assert amounts[0].amount == out_amount
  assert amounts[0].message == message

def test_ctx_out_keys_are_points():
  # The output keys are curve points (libblsct returns BlsctPoint). Read as
  # a Scalar, printing or serializing one aborted the interpreter.
  spend_pk = PublicKey()
  dest = SubAddr.from_double_public_key(
    DoublePublicKey.from_view_and_spend_keys(PublicKey(), spend_pk)
  )
  blinding_key = Scalar.random()
  tx_in = TxIn(410000, 100, Scalar(12), TokenId(), OutPoint(CTxId.deserialize(secrets.token_hex(32))))
  tx_out = TxOut(dest, 10000, 'keys', TokenId(), "Normal", 0, False, blinding_key)
  change_addr = SubAddr.from_double_public_key(
    DoublePublicKey.from_view_and_spend_keys(PublicKey(), PublicKey())
  )
  ctx_outs = CTx([tx_in], [tx_out], change_addr).get_ctx_outs()
  outs = [ctx_outs.at(i) for i in range(ctx_outs.size())]

  # Every output, payment, change and fee alike, yields serializable points.
  for out in outs:
    for key in (out.get_spending_key(), out.get_ephemeral_key(), out.get_blinding_key()):
      assert isinstance(key, Point)
      assert len(key.serialize()) == 96

  # The payment output is the one whose ephemeral key is G * blinding_key;
  # core sets its blinding key to spend_pk * blinding_key.
  expected_ephemeral = Point.from_scalar(blinding_key).serialize()
  payment = [o for o in outs if o.get_ephemeral_key().serialize() == expected_ephemeral]
  assert len(payment) == 1
  expected_blinding = spend_pk.get_point().scalar_multiply(blinding_key).serialize()
  assert payment[0].get_blinding_key().serialize() == expected_blinding
