use crate::{
  blsct_obj::{self, BlsctObj},
  blsct_serde::BlsctSerde,
  ctx_id::CTxId,
  ffi::{
    deserialize_out_point, free_obj, gen_out_point, serialize_ctx_id, serialize_out_point,
    BlsctOutPoint, BlsctRetVal,
  },
  macros::{impl_clone, impl_display, impl_from_retval, impl_value},
};
use serde::{Deserialize, Serialize};
use std::ffi::{c_char, c_void};

#[derive(Debug, Deserialize, Serialize, Eq)]
pub struct OutPoint {
  obj: BlsctObj<OutPoint, BlsctOutPoint>,
}

impl_from_retval!(OutPoint);
impl_display!(OutPoint);
impl_clone!(OutPoint);

impl OutPoint {
  pub fn new<'a>(ctx_id: &CTxId) -> Result<Self, blsct_obj::Error<'a>> {
    // gen_out_point takes the txid as a NUL-terminated hex string, not its bytes.
    let ctx_id_hex = unsafe { serialize_ctx_id(ctx_id.value()) };
    if ctx_id_hex.is_null() {
      return Err(blsct_obj::Error::FailedToAllocateMemory("CTxId hex"));
    }
    let rv = unsafe { gen_out_point(ctx_id_hex) };
    unsafe { free_obj(ctx_id_hex as *mut c_void) };
    let obj = BlsctObj::from_retval(rv)?;
    Ok(obj.into())
  }

  impl_value!(BlsctOutPoint);
}

impl BlsctSerde for OutPoint {
  unsafe fn serialize(ptr: *const u8, _: usize) -> *const i8 {
    serialize_out_point(ptr as *const BlsctOutPoint)
  }

  unsafe fn deserialize(hex: *const c_char) -> *mut BlsctRetVal {
    deserialize_out_point(hex)
  }
}

impl PartialEq for OutPoint {
  fn eq(&self, other: &Self) -> bool {
    self.obj == other.obj
  }
}

impl From<BlsctObj<OutPoint, BlsctOutPoint>> for OutPoint {
  fn from(obj: BlsctObj<OutPoint, BlsctOutPoint>) -> OutPoint {
    OutPoint { obj }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::{ctx_id::CTxId, initializer::init};

  #[test]
  fn test_deser() {
    init();
    let ctx_id = CTxId::random();
    let a = OutPoint::new(&ctx_id).unwrap();
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<OutPoint>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
