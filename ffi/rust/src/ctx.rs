use crate::{
  blsct_obj::{self, BlsctObj},
  blsct_serde::BlsctSerde,
  ctx_id::CTxId,
  ctx_ins::CTxIns,
  ctx_outs::CTxOuts,
  ffi::{
    add_to_tx_in_vec, add_to_tx_out_vec, build_ctx, build_ctx_with_change, create_tx_in_vec,
    create_tx_out_vec, delete_ctx, delete_tx_in_vec, delete_tx_out_vec, deserialize_ctx,
    deserialize_ctx_id, free_obj, get_ctx_id, get_ctx_ins, get_ctx_outs, serialize_ctx, BlsctCTx,
    BlsctCTxId, BlsctRetVal, BLSCT_IN_AMOUNT_ERROR, BLSCT_OUT_AMOUNT_ERROR,
  },
  macros::{impl_clone, impl_display},
  sub_addr::SubAddr,
  tx_in::TxIn,
  tx_out::TxOut,
};
use serde::{Deserialize, Serialize};
use std::{
  ffi::{c_char, c_void},
  fmt,
  ptr::NonNull,
};

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
  FailedToAllocateMemory,
  InAmountError(usize),
  OutAmountError(usize),
  FailedToBuildCTx(u8),
}

impl std::error::Error for Error {}

impl fmt::Display for Error {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Error::FailedToAllocateMemory => write!(f, "Failed to allocate memory for CTx"),
      Error::InAmountError(index) => write!(f, "Invalid in-amount found at {index}"),
      Error::OutAmountError(index) => write!(f, "Invalid out-amount found at {index}"),
      Error::FailedToBuildCTx(e) => write!(f, "Failed to build CTx: {e}"),
    }
  }
}

#[derive(Debug, Deserialize, Serialize, Eq)]
pub struct CTx {
  obj: BlsctObj<CTx, BlsctCTx>,
}

impl_display!(CTx);
impl_clone!(CTx);

impl CTx {
  /// Builds a transaction from `tx_ins` and `tx_outs`. Inputs that exceed the
  /// outputs plus fee need `change_addr`, a self-owned address the change is
  /// paid to; without one libblsct only builds when the inputs cover the
  /// outputs and fee exactly.
  pub fn new(
    tx_ins: &Vec<TxIn>,
    tx_outs: &Vec<TxOut>,
    change_addr: Option<&SubAddr>,
  ) -> Result<Self, Error> {
    unsafe {
      let vp_tx_ins = create_tx_in_vec();
      let vp_tx_outs = create_tx_out_vec();

      for tx_in in tx_ins {
        add_to_tx_in_vec(vp_tx_ins, tx_in.value());
      }
      for tx_out in tx_outs {
        add_to_tx_out_vec(vp_tx_outs, tx_out.value());
      }
      let rv = match change_addr {
        Some(addr) => build_ctx_with_change(vp_tx_ins, vp_tx_outs, addr.value()),
        None => build_ctx(vp_tx_ins, vp_tx_outs),
      };
      if rv.is_null() {
        delete_tx_in_vec(vp_tx_ins);
        delete_tx_out_vec(vp_tx_outs);
        return Err(Error::FailedToAllocateMemory);
      }

      let clean_up = || {
        delete_tx_in_vec(vp_tx_ins);
        delete_tx_out_vec(vp_tx_outs);
        free_obj(rv as *mut c_void);
      };

      if (*rv).result == 0 {
        let vp_ctx = NonNull::<u8>::new((*rv).ctx as *mut u8).unwrap();
        let obj = BlsctObj::<CTx, BlsctCTx>::new_with_deallocator(vp_ctx, 0, Some(delete_ctx)); // size will not be used

        clean_up();
        Ok(obj.into())
      } else {
        let e = {
          match (*rv).result {
            BLSCT_IN_AMOUNT_ERROR => {
              let index = (*rv).in_amount_err_index;
              Error::InAmountError(index)
            }
            BLSCT_OUT_AMOUNT_ERROR => {
              let index = (*rv).out_amount_err_index;
              Error::OutAmountError(index)
            }
            err_code => Error::FailedToBuildCTx(err_code),
          }
        };
        clean_up();
        Err(e)
      }
    }
  }

  pub fn get_ctx_id<'a>(&self) -> Result<CTxId, blsct_obj::Error<'a>> {
    let rv = unsafe {
      let c_str_hex = get_ctx_id(self.value());
      deserialize_ctx_id(c_str_hex)
    };
    let obj = BlsctObj::<CTxId, BlsctCTxId>::from_retval(rv)?;
    Ok(obj.into())
  }

  pub fn get_ctx_ins(&self) -> CTxIns {
    let obj = unsafe { get_ctx_ins(self.value()) };
    obj.into()
  }

  pub fn get_ctx_outs(&self) -> CTxOuts {
    let obj = unsafe { get_ctx_outs(self.value()) };
    obj.into()
  }

  // not using impl_void_ptr_value!() to return *mut c_void
  // to avoid const_cast
  pub fn value(&self) -> *mut c_void {
    self.obj.as_ptr() as *mut c_void
  }
}

impl BlsctSerde for CTx {
  unsafe fn serialize(ptr: *const u8, _: usize) -> *const i8 {
    serialize_ctx(ptr as *mut c_void)
  }

  unsafe fn deserialize(hex: *const c_char) -> *mut BlsctRetVal {
    deserialize_ctx(hex)
  }
}

impl From<BlsctObj<CTx, BlsctCTx>> for CTx {
  fn from(obj: BlsctObj<CTx, BlsctCTx>) -> CTx {
    CTx { obj }
  }
}

impl PartialEq for CTx {
  fn eq(&self, other: &Self) -> bool {
    self.obj == other.obj
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{
    amount_recovery_req::AmountRecoveryReq,
    ffi::{get_ctx_ins_size, get_ctx_outs_size},
    initializer::init,
    keys::{double_public_key::DoublePublicKey, public_key::PublicKey},
    point::Point,
    range_proof::RangeProof,
    scalar::Scalar,
    sub_addr::SubAddr,
    test_util::{gen_ctx, gen_ctx_actual},
  };

  #[test]
  fn test_get_ctx_id() {
    init();
    let ctx = gen_ctx();
    let _ = ctx.get_ctx_id();
  }

  #[test]
  fn test_get_ctx_ins() {
    init();
    let ctx = gen_ctx();
    let ctx_ins = ctx.get_ctx_ins();
    let ctx_ins_size = unsafe { get_ctx_ins_size(ctx_ins.value()) };
    assert_eq!(ctx_ins_size, 1);
  }

  #[test]
  fn test_get_ctx_outs() {
    init();
    let ctx = gen_ctx();
    let ctx_outs = ctx.get_ctx_outs();
    let ctx_outs_size = unsafe { get_ctx_outs_size(ctx_outs.value()) };
    assert_eq!(ctx_outs_size, 3);
  }

  #[test]
  fn test_amount_recovery() {
    init();
    let pk_view_key = PublicKey::random().unwrap();
    let pk_spend_key = PublicKey::random().unwrap();
    let dpk = DoublePublicKey::from_view_and_spend_keys(&pk_view_key, &pk_spend_key).unwrap();
    let destination: SubAddr = dpk.into();
    let blinding_key = Scalar::random().unwrap();
    let out_amount = 12345;
    let msg = "space_x";
    let ctx = gen_ctx_actual(out_amount, msg, &destination, &blinding_key);
    let ctx_outs = ctx.get_ctx_outs();
    let ctx_outs_size = unsafe { get_ctx_outs_size(ctx_outs.value()) };
    assert_eq!(ctx_outs_size, 3);
    // libblsct shuffles the outputs; the payment is the one whose ephemeral
    // key is G * blinding_key.
    let expected_ephemeral = Point::base().unwrap().scalar_multiply(&blinding_key);
    let payment = (0..ctx_outs.len())
      .map(|i| ctx_outs.at(i).unwrap())
      .find(|out| out.blsct_data_ephemeral_key() == expected_ephemeral)
      .unwrap();

    let rp = payment.blsct_data_range_proof().unwrap();
    let nonce = pk_view_key.get_point().scalar_multiply(&blinding_key);
    let req = AmountRecoveryReq::new(&rp, &nonce);
    let amounts = RangeProof::recover_amounts(vec![req]).unwrap();

    assert_eq!(amounts.len(), 1);
    assert!(amounts[0].is_succ);
    assert_eq!(amounts[0].amount, out_amount);
    assert_eq!(amounts[0].msg, msg);
  }

  #[test]
  fn test_ctx_out_keys_are_points() {
    init();
    let pk_spend_key = PublicKey::random().unwrap();
    let dpk =
      DoublePublicKey::from_view_and_spend_keys(&PublicKey::random().unwrap(), &pk_spend_key)
        .unwrap();
    let destination: SubAddr = dpk.into();
    let blinding_key = Scalar::random().unwrap();
    let ctx = gen_ctx_actual(10000, "keys", &destination, &blinding_key);
    let ctx_outs = ctx.get_ctx_outs();

    let expected_ephemeral = Point::base().unwrap().scalar_multiply(&blinding_key);
    let payment = (0..ctx_outs.len())
      .map(|i| ctx_outs.at(i).unwrap())
      .find(|out| out.blsct_data_ephemeral_key() == expected_ephemeral)
      .unwrap();
    // libblsct sets the payment's blinding key to spend_pk * blinding_key.
    let expected_blinding = pk_spend_key.get_point().scalar_multiply(&blinding_key);
    assert!(payment.blsct_data_blinding_key() == expected_blinding);
    assert!(payment.blsct_data_spending_key().is_valid());
  }

  #[test]
  fn test_deser() {
    init();
    let a = gen_ctx();
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<CTx>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
