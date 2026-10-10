#[cfg(test)]
use crate::{
  ctx::CTx, ctx_id::CTxId, ffi::TxOutputType, keys::child_key::ChildKey,
  keys::public_key::PublicKey, out_point::OutPoint, scalar::Scalar, sub_addr::SubAddr,
  sub_addr_id::SubAddrId, token_id::TokenId, tx_in::TxIn, tx_out::TxOut,
};

#[cfg(test)]
pub fn gen_ctx_actual(
  out_amount: u64,
  msg: &str,
  destination: &SubAddr,
  blinding_key: &Scalar,
) -> CTx {
  let spending_key = ChildKey::random().unwrap().to_tx_key().to_spending_key();
  let out_point = {
    let ctx_id = CTxId::random();
    OutPoint::new(&ctx_id).unwrap()
  };
  let num_tx_in = 1;
  let num_tx_out = 1;
  let default_fee = 200000;
  let fee = (num_tx_in + num_tx_out) * default_fee;
  let in_amount = fee + out_amount;

  let gamma = Scalar::new(100).unwrap();
  let tx_in = TxIn::new(
    in_amount,
    &gamma,
    &spending_key,
    &TokenId::default().unwrap(),
    &out_point,
    false,
    false,
  )
  .unwrap();

  let tx_out = TxOut::new(
    destination,
    out_amount,
    msg,
    &TokenId::default().unwrap(),
    TxOutputType::Normal,
    0,
    false,
    Some(blinding_key),
  )
  .unwrap();

  let tx_ins = vec![tx_in];
  let tx_outs = vec![tx_out];
  // The fee is size-based, so the input over-funds it; the remainder is
  // change, which libblsct only pays to an address someone owns.
  let change_addr = {
    let view_key = ChildKey::random().unwrap().to_tx_key().to_view_key();
    let spending_pub_key = PublicKey::random().unwrap();
    SubAddr::new(&view_key, &spending_pub_key, &SubAddrId::new(0, 0))
  };
  CTx::new(&tx_ins, &tx_outs, Some(&change_addr)).unwrap()
}

#[cfg(test)]
pub fn gen_ctx() -> CTx {
  let destination = {
    let view_key = ChildKey::random().unwrap().to_tx_key().to_view_key();
    let spending_pub_key = PublicKey::random().unwrap();
    let sub_addr_id = SubAddrId::new(67, 78);
    SubAddr::new(&view_key, &spending_pub_key, &sub_addr_id)
  };
  let blinding_key = Scalar::random().unwrap();

  gen_ctx_actual(10000, "navio", &destination, &blinding_key)
}
