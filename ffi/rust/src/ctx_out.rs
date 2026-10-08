use crate::{
  blsct_obj::{self, BlsctObj},
  ffi::{
    are_ctx_out_equal, get_ctx_out_blinding_key, get_ctx_out_ephemeral_key,
    get_ctx_out_range_proof, get_ctx_out_script_pub_key, get_ctx_out_spending_key,
    get_ctx_out_token_id, get_ctx_out_value, get_ctx_out_vector_predicate, get_ctx_out_view_tag,
    BlsctPoint, BlsctRangeProof, BlsctRetVal, BlsctScript, BlsctTokenId, BlsctVectorPredicate,
  },
  macros::impl_value_raw_const_obj,
  point::Point,
  range_proof::RangeProof,
  script::Script,
  token_id::TokenId,
  vector_predicate::VectorPredicate,
};
use std::ffi::c_void;

#[derive(Debug)]
pub struct CTxOut {
  obj: *const c_void,
}

impl CTxOut {
  pub fn out_value(&self) -> u64 {
    unsafe { get_ctx_out_value(self.value()) }
  }

  pub fn script_pub_key(&self) -> Script {
    let c_obj = unsafe { get_ctx_out_script_pub_key(self.value()) };
    BlsctObj::<Script, BlsctScript>::from_c_obj(c_obj as *mut BlsctScript).into()
  }

  pub fn token_id(&self) -> TokenId {
    let c_obj = unsafe { get_ctx_out_token_id(self.value()) };
    BlsctObj::<TokenId, BlsctTokenId>::from_c_obj(c_obj as *mut BlsctTokenId).into()
  }

  pub fn vector_predicate(&self) -> Result<VectorPredicate, blsct_obj::Error<'_>> {
    let rv = unsafe { get_ctx_out_vector_predicate(self.value()) };
    let obj = BlsctObj::<VectorPredicate, BlsctVectorPredicate>::from_retval(rv)?;
    Ok(obj.into())
  }

  pub fn blsct_data_spending_key(&self) -> Point {
    let c_obj = unsafe { get_ctx_out_spending_key(self.value()) };
    BlsctObj::<Point, BlsctPoint>::from_c_obj(c_obj as *mut BlsctPoint).into()
  }

  pub fn blsct_data_ephemeral_key(&self) -> Point {
    let c_obj = unsafe { get_ctx_out_ephemeral_key(self.value()) };
    BlsctObj::<Point, BlsctPoint>::from_c_obj(c_obj as *mut BlsctPoint).into()
  }

  pub fn blsct_data_blinding_key(&self) -> Point {
    let c_obj = unsafe { get_ctx_out_blinding_key(self.value()) };
    BlsctObj::<Point, BlsctPoint>::from_c_obj(c_obj as *mut BlsctPoint).into()
  }

  pub fn blsct_data_range_proof(&self) -> Result<RangeProof, blsct_obj::Error<'_>> {
    let rv = unsafe { get_ctx_out_range_proof(self.value()) } as *mut BlsctRetVal;
    let obj = BlsctObj::<RangeProof, BlsctRangeProof>::from_retval(rv)?;
    Ok(obj.into())
  }

  pub fn blsct_data_view_tag(&self) -> u16 {
    unsafe { get_ctx_out_view_tag(self.value()) }
  }

  impl_value_raw_const_obj!();
}

impl From<*const c_void> for CTxOut {
  fn from(obj: *const c_void) -> CTxOut {
    CTxOut { obj }
  }
}

impl PartialEq for CTxOut {
  fn eq(&self, other: &Self) -> bool {
    unsafe { are_ctx_out_equal(self.value(), other.value()) }
  }
}

impl Eq for CTxOut {}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{initializer::init, test_util::gen_ctx};

  fn get_ctx_out() -> CTxOut {
    let ctx = gen_ctx();
    let ctx_outs = ctx.get_ctx_outs();
    let ctx_out = ctx_outs.at(0).unwrap();
    ctx_out
  }

  #[test]
  fn test_out_value() {
    init();
    let ctx_out = get_ctx_out();
    let out_value = ctx_out.out_value();
    println!("OutValue: {out_value}");
  }

  #[test]
  fn test_script_pub_key() {
    init();
    let ctx_out = get_ctx_out();
    let script_pub_key = ctx_out.script_pub_key();
    println!("ScriptPubKey: {script_pub_key}");
  }

  #[test]
  fn test_token_id() {
    init();
    let ctx_out = get_ctx_out();
    let token_id = ctx_out.token_id();
    println!("TokenId: {}, {}", token_id.token(), token_id.subid());
  }

  #[test]
  fn test_vector_predicate() {
    init();
    let ctx_out = get_ctx_out();
    let vector_predicate = ctx_out.vector_predicate();
    println!("VectorPredicate: {vector_predicate:?}");
  }

  #[test]
  fn test_spending_key() {
    init();
    let ctx_out = get_ctx_out();
    let spending_key = ctx_out.blsct_data_spending_key();
    println!("BlsctData.SpendingKey: {spending_key:?}");
  }

  #[test]
  fn test_ephemeral_key() {
    init();
    let ctx_out = get_ctx_out();
    let ephemeral_key = ctx_out.blsct_data_ephemeral_key();
    println!("BlsctData.EphemeralKey: {ephemeral_key:?}");
  }

  #[test]
  fn test_blinding_key() {
    init();
    let ctx_out = get_ctx_out();
    let blinding_key = ctx_out.blsct_data_blinding_key();
    println!("BlsctData.BlindingKey: {blinding_key:?}");
  }

  #[test]
  fn test_range_proof() {
    init();
    let ctx_out = get_ctx_out();
    let range_proof = ctx_out.blsct_data_range_proof();
    println!("BlsctData.RangeProof: {range_proof:?}");
  }

  #[test]
  fn test_view_tag() {
    init();
    let ctx_out = get_ctx_out();
    let view_tag = ctx_out.blsct_data_view_tag();
    println!("BlsctData.ViewTag: {view_tag}");
  }
}
