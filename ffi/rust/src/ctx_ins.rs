use crate::{
  ctx_in::CTxIn,
  ffi::{are_ctx_ins_equal, get_ctx_in_at, get_ctx_ins_size},
  macros::impl_value_raw_const_obj,
};
use std::{ffi::c_void, fmt};

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
  IndexOutOfRange { index: usize, max_index: usize },
}

impl std::error::Error for Error {}

impl fmt::Display for Error {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Error::IndexOutOfRange { index, max_index } => {
        write!(f, "Index {index} is out of range. Max index is {max_index}")
      }
    }
  }
}

/* obj is an opaque pointer to:

   struct BlsctCTxIns {
     std::vector<CTxIn>* vec;
   };
*/
#[derive(Debug, Eq)]
pub struct CTxIns {
  obj: *const c_void,
}

impl CTxIns {
  pub fn get_ctx_in_at(&self, i: usize) -> Result<CTxIn, Error> {
    if i >= self.len() {
      return Err(Error::IndexOutOfRange {
        index: i,
        max_index: self.len() - 1,
      });
    }
    let obj = unsafe { get_ctx_in_at(self.value(), i) };
    Ok(obj.into())
  }

  pub fn len(&self) -> usize {
    unsafe { get_ctx_ins_size(self.value()) }
  }

  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }

  impl_value_raw_const_obj!();
}

impl From<*const c_void> for CTxIns {
  fn from(obj: *const c_void) -> CTxIns {
    CTxIns { obj }
  }
}

impl PartialEq for CTxIns {
  fn eq(&self, other: &Self) -> bool {
    unsafe { are_ctx_ins_equal(self.value(), other.value()) }
  }
}
