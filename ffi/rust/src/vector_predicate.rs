use crate::{
  blsct_obj::BlsctObj,
  blsct_serde::BlsctSerde,
  ffi::{
    are_vector_predicate_equal, deserialize_vector_predicate, free_obj, get_data_predicate_data,
    serialize_vector_predicate, BlsctRetVal, BlsctVectorPredicate,
  },
  macros::{impl_clone, impl_display, impl_from_retval, impl_size, impl_value},
};
use serde::{Deserialize, Serialize};
use std::ffi::{c_char, c_void};

#[derive(Debug, Deserialize, Serialize, Eq)]
pub struct VectorPredicate {
  obj: BlsctObj<VectorPredicate, BlsctVectorPredicate>,
}

impl_from_retval!(VectorPredicate);
impl_display!(VectorPredicate);
impl_clone!(VectorPredicate);

impl VectorPredicate {
  impl_size!();
  impl_value!(BlsctVectorPredicate);

  /// The payload of a DATA predicate, without the operation byte and length
  /// prefix that frame it (for example a stake-delegation payload, see
  /// `stake_delegation::recover_stake_delegation_owner_info`). `None` when
  /// this is not a DATA predicate, or libblsct could not allocate the result.
  pub fn data_predicate_data(&self) -> Option<Vec<u8>> {
    let rv = unsafe { get_data_predicate_data(self.value(), self.size()) };
    if rv.is_null() {
      return None;
    }
    let (result, data, size) = unsafe { ((*rv).result, (*rv).value, (*rv).value_size) };
    unsafe { free_obj(rv as *mut c_void) };
    if result != 0 {
      return None;
    }
    let bytes = if size == 0 {
      Vec::new()
    } else {
      unsafe { std::slice::from_raw_parts(data as *const u8, size) }.to_vec()
    };
    unsafe { free_obj(data as *mut c_void) };
    Some(bytes)
  }
}

impl BlsctSerde for VectorPredicate {
  unsafe fn serialize(ptr: *const u8, obj_size: usize) -> *const i8 {
    serialize_vector_predicate(ptr as *const BlsctVectorPredicate, obj_size)
  }

  unsafe fn deserialize(hex: *const c_char) -> *mut BlsctRetVal {
    deserialize_vector_predicate(hex)
  }
}

impl PartialEq for VectorPredicate {
  fn eq(&self, other: &Self) -> bool {
    unsafe {
      are_vector_predicate_equal(self.value(), self.size(), other.value(), other.size()) != 0
    }
  }
}

impl From<BlsctObj<VectorPredicate, BlsctVectorPredicate>> for VectorPredicate {
  fn from(obj: BlsctObj<VectorPredicate, BlsctVectorPredicate>) -> VectorPredicate {
    VectorPredicate { obj }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::initializer::init;

  fn vector_predicate_from_bytes(bytes: &[u8]) -> VectorPredicate {
    let c_obj = unsafe {
      let c_obj = libc::malloc(bytes.len()) as *mut u8;
      std::ptr::copy_nonoverlapping(bytes.as_ptr(), c_obj, bytes.len());
      c_obj
    };
    let obj: BlsctObj<VectorPredicate, BlsctVectorPredicate> =
      BlsctObj::from_c_obj_and_size(c_obj as *mut c_void, bytes.len());
    obj.into()
  }

  #[test]
  fn test_data_predicate_data() {
    init();
    // A DATA predicate: operation byte 4, then the payload as a
    // CompactSize-prefixed byte vector.
    let data = vector_predicate_from_bytes(&[0x04, 0x03, 0xaa, 0xbb, 0xcc]);
    assert_eq!(data.data_predicate_data(), Some(vec![0xaa, 0xbb, 0xcc]));

    // PAY_FEE (operation byte 3) is not DATA.
    let pay_fee = vector_predicate_from_bytes(&[0x03]);
    assert_eq!(pay_fee.data_predicate_data(), None);
  }

  fn gen_vector_predicate(n: u8) -> VectorPredicate {
    const OBJ_SIZE: usize = 5;

    let c_obj = unsafe {
      let c_obj = libc::malloc(OBJ_SIZE) as *mut BlsctVectorPredicate;
      for i in 0..OBJ_SIZE {
        *c_obj.add(i) = n;
      }
      c_obj
    };
    let obj: BlsctObj<VectorPredicate, BlsctVectorPredicate> =
      BlsctObj::from_c_obj_and_size(c_obj as *mut c_void, OBJ_SIZE);
    obj.into()
  }

  #[test]
  fn test_eq() {
    init();
    let a = gen_vector_predicate(1);
    let b = gen_vector_predicate(1);
    let c = gen_vector_predicate(2);

    assert_eq!(a, a);
    assert_eq!(b, b);
    assert_eq!(c, c);

    assert_eq!(a, b);
    assert_ne!(a, c);
    assert_ne!(b, c);
  }

  #[test]
  fn test_deser() {
    init();
    let a = gen_vector_predicate(2);
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<VectorPredicate>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
