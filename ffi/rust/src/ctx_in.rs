use crate::{
  blsct_obj::BlsctObj,
  ctx_id::CTxId,
  ffi::{
    are_ctx_in_equal, get_ctx_in_prev_out_hash, get_ctx_in_script_sig, get_ctx_in_script_witness,
    get_ctx_in_sequence, BlsctCTxId, BlsctScript,
  },
  macros::impl_value_raw_const_obj,
  script::Script,
};
use std::ffi::c_void;

#[derive(Debug)]
pub struct CTxIn {
  obj: *const c_void,
}

impl CTxIn {
  pub fn prev_out_hash(&self) -> CTxId {
    let c_obj = unsafe { get_ctx_in_prev_out_hash(self.value()) };
    BlsctObj::<CTxId, BlsctCTxId>::from_c_obj(c_obj as *mut BlsctCTxId).into()
  }

  pub fn script_sig(&self) -> Script {
    let c_obj = unsafe { get_ctx_in_script_sig(self.value()) };
    BlsctObj::<Script, BlsctScript>::from_c_obj(c_obj as *mut BlsctScript).into()
  }

  pub fn sequence(&self) -> u32 {
    unsafe { get_ctx_in_sequence(self.value()) }
  }

  pub fn script_witness(&self) -> Script {
    let c_obj = unsafe { get_ctx_in_script_witness(self.value()) };
    BlsctObj::<Script, BlsctScript>::from_c_obj(c_obj as *mut BlsctScript).into()
  }

  impl_value_raw_const_obj!();
}

impl From<*const c_void> for CTxIn {
  fn from(obj: *const c_void) -> CTxIn {
    CTxIn { obj }
  }
}

impl PartialEq for CTxIn {
  fn eq(&self, other: &Self) -> bool {
    unsafe { are_ctx_in_equal(self.value(), other.value()) }
  }
}

impl Eq for CTxIn {}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{initializer::init, test_util::gen_ctx};

  fn get_ctx_in() -> CTxIn {
    let ctx = gen_ctx();
    let ctx_ins = ctx.get_ctx_ins();
    ctx_ins.get_ctx_in_at(0).unwrap()
  }

  #[test]
  fn test_prev_out_hash() {
    init();
    let ctx_in = get_ctx_in();
    let _ = ctx_in.prev_out_hash();
  }

  #[test]
  fn test_script_sig() {
    init();
    let ctx_in = get_ctx_in();
    let _ = ctx_in.script_sig();
  }

  #[test]
  fn test_sequence() {
    init();
    let ctx_in = get_ctx_in();
    let _ = ctx_in.sequence();
  }

  #[test]
  fn test_script_witness() {
    init();
    let ctx_in = get_ctx_in();
    let _ = ctx_in.script_witness();
  }
}
