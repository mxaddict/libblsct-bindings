use crate::{
  ctx_out::CTxOut,
  ffi::{are_ctx_outs_equal, get_ctx_out_at, get_ctx_outs_size},
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

   struct BlsctCTxOuts {
     std::vector<CTxOut>* vec;
   };
*/
#[derive(Debug)]
pub struct CTxOuts {
  obj: *const c_void,
}

impl CTxOuts {
  pub fn at(&self, i: usize) -> Result<CTxOut, Error> {
    if i >= self.len() {
      return Err(Error::IndexOutOfRange {
        index: i,
        max_index: self.len() - 1,
      });
    }
    let obj = unsafe { get_ctx_out_at(self.value(), i) };
    Ok(obj.into())
  }

  pub fn len(&self) -> usize {
    unsafe { get_ctx_outs_size(self.value()) }
  }

  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }

  impl_value_raw_const_obj!();
}

impl From<*const c_void> for CTxOuts {
  fn from(obj: *const c_void) -> CTxOuts {
    CTxOuts { obj }
  }
}

impl PartialEq for CTxOuts {
  fn eq(&self, other: &Self) -> bool {
    unsafe { are_ctx_outs_equal(self.value(), other.value()) }
  }
}
