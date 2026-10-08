use crate::{
  blsct_obj::{self, BlsctObj},
  blsct_serde::BlsctSerde,
  ffi::{
    blsct_succ, buf_to_malloced_hex_c_str, build_tx_in, get_tx_in_amount, get_tx_in_gamma,
    get_tx_in_out_point, get_tx_in_rbf, get_tx_in_spending_key, get_tx_in_staked_commitment,
    get_tx_in_token_id, hex_to_malloced_buf, BlsctOutPoint, BlsctRetVal, BlsctScalar, BlsctTokenId,
    BlsctTxIn,
  },
  macros::{impl_clone, impl_display, impl_from_retval, impl_value},
  out_point::OutPoint,
  scalar::Scalar,
  token_id::TokenId,
};
use serde::{Deserialize, Serialize};
use std::ffi::{c_char, c_void, CStr};

#[derive(Debug, Deserialize, Serialize, Eq)]
pub struct TxIn {
  obj: BlsctObj<TxIn, BlsctTxIn>,
}

impl_clone!(TxIn);
impl_display!(TxIn);
impl_from_retval!(TxIn);

impl TxIn {
  pub fn new<'a>(
    amount: u64,
    gamma: &Scalar,
    spending_key: &Scalar,
    token_id: &TokenId,
    out_point: &OutPoint,
    is_staked_commitment: bool,
    is_rbf: bool,
  ) -> Result<Self, blsct_obj::Error<'a>> {
    let rv = unsafe {
      build_tx_in(
        amount,
        gamma.value(),
        spending_key.value(),
        token_id.value(),
        out_point.value(),
        is_staked_commitment,
        is_rbf,
      )
    };

    let obj = BlsctObj::from_retval(rv)?;
    Ok(obj.into())
  }

  pub fn amount(&self) -> u64 {
    unsafe { get_tx_in_amount(self.value()) }
  }

  pub fn gamma(&self) -> Scalar {
    let rv = unsafe { get_tx_in_gamma(self.value()) };
    BlsctObj::<Scalar, BlsctScalar>::copy_from_c_obj(rv).into()
  }

  pub fn spending_key(&self) -> Scalar {
    let rv = unsafe { get_tx_in_spending_key(self.value()) };
    BlsctObj::<Scalar, BlsctScalar>::copy_from_c_obj(rv).into()
  }

  pub fn token_id(&self) -> TokenId {
    let rv = unsafe { get_tx_in_token_id(self.value()) };
    BlsctObj::<TokenId, BlsctTokenId>::copy_from_c_obj(rv).into()
  }

  pub fn out_point(&self) -> OutPoint {
    let rv = unsafe { get_tx_in_out_point(self.value()) };
    BlsctObj::<OutPoint, BlsctOutPoint>::copy_from_c_obj(rv).into()
  }

  pub fn is_staked_commitment(&self) -> bool {
    unsafe { get_tx_in_staked_commitment(self.value()) }
  }

  pub fn is_rbf(&self) -> bool {
    unsafe { get_tx_in_rbf(self.value()) }
  }

  impl_value!(BlsctTxIn);
}

impl BlsctSerde for TxIn {
  unsafe fn serialize(ptr: *const u8, size: usize) -> *const i8 {
    buf_to_malloced_hex_c_str(ptr, size)
  }

  unsafe fn deserialize(hex: *const c_char) -> *mut BlsctRetVal {
    let buf = hex_to_malloced_buf(hex);
    let len = CStr::from_ptr(hex)
      .to_str()
      .expect("Malformed c-string found")
      .len()
      / 2;
    blsct_succ(buf as *mut c_void, len)
  }
}

impl From<BlsctObj<TxIn, BlsctTxIn>> for TxIn {
  fn from(obj: BlsctObj<TxIn, BlsctTxIn>) -> TxIn {
    TxIn { obj }
  }
}

impl PartialEq for TxIn {
  fn eq(&self, other: &Self) -> bool {
    self.amount() == other.amount()
      && self.gamma() == other.gamma()
      && self.spending_key() == other.spending_key()
      && self.token_id() == other.token_id()
      && self.out_point() == other.out_point()
      && self.is_staked_commitment() == other.is_staked_commitment()
      && self.is_rbf() == other.is_rbf()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{
    ctx_id::CTxId, initializer::init, keys::child_key::ChildKey, out_point::OutPoint,
    scalar::Scalar, token_id::TokenId,
  };

  fn gen_tx_in(amount: u64) -> TxIn {
    let spending_key = {
      let child_key = ChildKey::random().unwrap();
      child_key.to_tx_key().to_spending_key()
    };
    let gamma = Scalar::new(42).unwrap();
    let out_point = {
      let ctx_id = CTxId::random();
      OutPoint::new(&ctx_id).unwrap()
    };
    let token_id = TokenId::default().unwrap();
    TxIn::new(
      amount,
      &gamma,
      &spending_key,
      &token_id,
      &out_point,
      false,
      false,
    )
    .unwrap()
  }

  #[test]
  fn test_amount() {
    init();
    let tx_in = gen_tx_in(123);
    let amount = tx_in.amount();
    assert_eq!(amount, 123);
  }

  #[test]
  fn test_gamma() {
    init();
    let tx_in = gen_tx_in(123);
    let gamma = tx_in.gamma();
    assert_eq!(gamma, Scalar::new(42).unwrap());
  }

  #[test]
  fn test_spending_key() {
    init();
    let tx_in = gen_tx_in(123);
    let _ = tx_in.spending_key();
  }

  #[test]
  fn test_token_id() {
    init();
    let tx_in = gen_tx_in(123);
    let token_id = tx_in.token_id();
    assert_eq!(token_id, TokenId::default().unwrap());
  }

  #[test]
  fn test_out_point() {
    init();
    let tx_in = gen_tx_in(123);
    let _ = tx_in.out_point();
  }

  #[test]
  fn test_is_staked_commitment() {
    init();
    let tx_in = gen_tx_in(123);
    let is_staked_commitment = tx_in.is_staked_commitment();
    assert_eq!(is_staked_commitment, false);
  }

  #[test]
  fn test_is_rbf() {
    init();
    let tx_in = gen_tx_in(123);
    let is_rbf = tx_in.is_rbf();
    assert_eq!(is_rbf, false);
  }

  #[test]
  fn test_eq() {
    init();
    let a = gen_tx_in(123);
    let b = gen_tx_in(456);

    assert!(a == a);
    assert!(a != b);
    assert!(b != a);
    assert!(b == b);
  }

  #[test]
  fn test_deser() {
    init();
    let a = gen_tx_in(123);
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<TxIn>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
