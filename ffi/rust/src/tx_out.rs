use crate::{
  blsct_obj::{self, BlsctObj},
  blsct_serde::BlsctSerde,
  ffi::{
    blsct_err, blsct_succ, buf_to_malloced_hex_c_str, build_tx_out, get_tx_out_amount,
    get_tx_out_blinding_key, get_tx_out_destination, get_tx_out_memo, get_tx_out_min_stake,
    get_tx_out_output_type, get_tx_out_subtract_fee_from_amount, get_tx_out_token_id,
    hex_to_malloced_buf, BlsctRetVal, BlsctScalar, BlsctSubAddr, BlsctTokenId, BlsctTxOut,
    TxOutputType, BLSCT_FAILURE,
  },
  macros::{impl_clone, impl_display, impl_from_retval, impl_value},
  scalar::Scalar,
  sub_addr::SubAddr,
  token_id::TokenId,
};
use serde::{Deserialize, Serialize};
use std::{
  ffi::{c_char, c_void, CStr, CString, NulError},
  fmt,
  str::Utf8Error,
};

#[derive(Debug, PartialEq, Eq)]
pub enum Error<'a> {
  BlsctObjError(blsct_obj::Error<'a>),
  FailedToCreateCString(NulError),
  FailedToConvertCStrToStr(Utf8Error),
}

impl<'a> std::error::Error for Error<'a> {}

impl<'a> fmt::Display for Error<'a> {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Error::BlsctObjError(e) => write!(f, "BlsctObjError: {e:?}"),
      Error::FailedToCreateCString(e) => write!(f, "Failed to create CString: {e:?}"),
      Error::FailedToConvertCStrToStr(e) => {
        write!(f, "Failed to convert CStr to &str: {e:?}")
      }
    }
  }
}
#[derive(Debug, Deserialize, Serialize, Eq)]
pub struct TxOut {
  obj: BlsctObj<TxOut, BlsctTxOut>,
}

impl_clone!(TxOut);
impl_display!(TxOut);
impl_from_retval!(TxOut);

impl TxOut {
  pub fn new<'a>(
    destination: &SubAddr,
    amount: u64,
    memo: &str,
    token_id: &TokenId,
    output_type: TxOutputType,
    min_stake: u64,
    subtract_fee_from_amount: bool,
    opt_blinding_key: Option<&Scalar>,
  ) -> Result<Self, Error<'a>> {
    let memo_c_str = CString::new(memo).map_err(Error::FailedToCreateCString)?;

    let zero = Scalar::new(0).unwrap();
    let blinding_key = opt_blinding_key.unwrap_or(&zero);

    let rv = unsafe {
      build_tx_out(
        destination.value(),
        amount,
        memo_c_str.as_ptr(),
        memo.len(),
        token_id.value(),
        output_type,
        min_stake,
        subtract_fee_from_amount,
        blinding_key.value(),
      )
    };
    let obj = BlsctObj::from_retval(rv).map_err(Error::BlsctObjError)?;

    Ok(obj.into())
  }

  pub fn destination(&self) -> SubAddr {
    let obj = unsafe { get_tx_out_destination(self.value()) } as *mut BlsctSubAddr;
    BlsctObj::<SubAddr, BlsctSubAddr>::from_c_obj(obj).into()
  }

  pub fn amount(&self) -> u64 {
    unsafe { get_tx_out_amount(self.value()) }
  }

  pub fn memo(&self) -> Result<String, Error<'_>> {
    let c_str = unsafe {
      let ptr = get_tx_out_memo(self.value());
      CStr::from_ptr(ptr)
    };
    let str = c_str.to_str().map_err(Error::FailedToConvertCStrToStr)?;
    Ok(str.to_owned())
  }

  pub fn token_id(&self) -> TokenId {
    let obj = unsafe { get_tx_out_token_id(self.value()) } as *mut BlsctTokenId;
    BlsctObj::<TokenId, BlsctTokenId>::from_c_obj(obj).into()
  }

  pub fn output_type(&self) -> TxOutputType {
    unsafe { get_tx_out_output_type(self.value()) }
  }

  pub fn min_stake(&self) -> u64 {
    unsafe { get_tx_out_min_stake(self.value()) }
  }

  pub fn subtract_fee_from_amount(&self) -> bool {
    unsafe { get_tx_out_subtract_fee_from_amount(self.value()) }
  }

  pub fn blinding_key(&self) -> Scalar {
    let obj = unsafe { get_tx_out_blinding_key(self.value()) } as *mut BlsctScalar;
    BlsctObj::<Scalar, BlsctScalar>::from_c_obj(obj).into()
  }

  impl_value!(BlsctTxOut);
}

impl BlsctSerde for TxOut {
  unsafe fn serialize(ptr: *const u8, size: usize) -> *const i8 {
    buf_to_malloced_hex_c_str(ptr, size)
  }

  unsafe fn deserialize(hex: *const c_char) -> *mut BlsctRetVal {
    let buf = hex_to_malloced_buf(hex);

    match CStr::from_ptr(hex).to_str() {
      Err(_) => blsct_err(BLSCT_FAILURE),
      Ok(str) => {
        let len = str.len() / 2;
        blsct_succ(buf as *mut c_void, len)
      }
    }
  }
}

impl From<BlsctObj<TxOut, BlsctTxOut>> for TxOut {
  fn from(obj: BlsctObj<TxOut, BlsctTxOut>) -> TxOut {
    TxOut { obj }
  }
}

impl PartialEq for TxOut {
  fn eq(&self, other: &Self) -> bool {
    self.destination() == other.destination()
      && self.amount() == other.amount()
      && self.memo() == other.memo()
      && self.token_id() == other.token_id()
      && self.output_type() == other.output_type()
      && self.min_stake() == other.min_stake()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{
    initializer::init,
    keys::{child_key::ChildKey, public_key::PublicKey},
    sub_addr_id::SubAddrId,
    token_id::TokenId,
  };

  fn gen_tx_out(sub_addr_id: &SubAddrId) -> TxOut {
    let destination = {
      let view_key = ChildKey::random().unwrap().to_tx_key().to_view_key();
      let spending_pub_key = PublicKey::random().unwrap();
      SubAddr::new(&view_key, &spending_pub_key, &sub_addr_id)
    };
    let token_id = TokenId::default().unwrap();

    let blinding_key = Scalar::random().unwrap();
    TxOut::new(
      &destination,
      123,
      "navio",
      &token_id,
      TxOutputType::Normal,
      5,
      false,
      Some(&blinding_key),
    )
    .unwrap()
  }

  #[test]
  fn test_destination() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let _ = tx_out.destination();
  }

  #[test]
  fn test_amount() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let amount = tx_out.amount();
    assert_eq!(amount, 123);
  }

  #[test]
  fn test_memo() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let memo = tx_out.memo().unwrap();
    assert_eq!(&memo, "navio");
  }

  fn tx_out_with_memo<'a>(memo: &str) -> Result<TxOut, Error<'a>> {
    let destination = {
      let view_key = ChildKey::random().unwrap().to_tx_key().to_view_key();
      let spending_pub_key = PublicKey::random().unwrap();
      SubAddr::new(&view_key, &spending_pub_key, &SubAddrId::new(0, 0))
    };
    TxOut::new(
      &destination,
      123,
      memo,
      &TokenId::default().unwrap(),
      TxOutputType::Normal,
      0,
      false,
      None,
    )
  }

  #[test]
  fn test_memo_with_multi_byte_characters_round_trips() {
    init();
    let memo = "navio \u{30ca}\u{30d3}\u{30aa} \u{1F680}";
    assert_eq!(tx_out_with_memo(memo).unwrap().memo().unwrap(), memo);
  }

  #[test]
  fn test_memo_with_nul_is_rejected() {
    init();
    assert!(tx_out_with_memo("nav\0io").is_err());
  }

  #[test]
  fn test_token_id() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let token_id = tx_out.token_id();
    assert_eq!(token_id, TokenId::default().unwrap());
  }

  #[test]
  fn test_output_type() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let output_type = tx_out.output_type();
    assert_eq!(output_type, TxOutputType::Normal);
  }

  #[test]
  fn test_min_stake() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let min_stake = tx_out.min_stake();
    assert_eq!(min_stake, 5);
  }

  #[test]
  fn test_subtract_fee_from_amount() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let b = tx_out.subtract_fee_from_amount();
    assert_eq!(b, false);
  }

  #[test]
  fn test_blinding_key() {
    init();
    let sub_addr_id = SubAddrId::new(123, 456);
    let tx_out = gen_tx_out(&sub_addr_id);
    let _ = tx_out.blinding_key();
  }

  #[test]
  fn test_eq() {
    init();

    let a = {
      let sub_addr_id = SubAddrId::new(123, 456);
      gen_tx_out(&sub_addr_id)
    };
    let b = {
      let sub_addr_id = SubAddrId::new(234, 567);
      gen_tx_out(&sub_addr_id)
    };

    assert!(a == a);
    assert!(a != b);
    assert!(b != a);
    assert!(b == b);
  }

  #[test]
  fn test_deser() {
    init();

    let a = {
      let sub_addr_id = SubAddrId::new(123, 456);
      gen_tx_out(&sub_addr_id)
    };
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<TxOut>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
