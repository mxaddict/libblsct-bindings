use crate::{
  amount_recovery_req::AmountRecoveryReq,
  amount_recovery_res::AmountRecoveryRes,
  blsct_obj::{self, BlsctObj},
  blsct_serde::BlsctSerde,
  ffi::{
    add_to_amount_recovery_req_vec, add_to_range_proof_vec, add_to_uint64_vec, build_range_proof,
    create_amount_recovery_req_vec, create_range_proof_vec, create_uint64_vec,
    delete_amount_recovery_req_vec, delete_range_proof_vec, delete_uint64_vec,
    deserialize_range_proof, free_amounts_ret_val, free_obj, gen_amount_recovery_req,
    get_amount_recovery_result_amount, get_amount_recovery_result_is_succ,
    get_amount_recovery_result_msg, get_amount_recovery_result_size, get_range_proof_A,
    get_range_proof_A_wip, get_range_proof_B, get_range_proof_alpha_hat,
    get_range_proof_delta_prime, get_range_proof_r_prime, get_range_proof_s_prime,
    get_range_proof_tau_x, recover_amount, serialize_range_proof, verify_range_proofs, BlsctPoint,
    BlsctRangeProof, BlsctRetVal, BlsctScalar,
  },
  macros::{impl_clone, impl_display, impl_from_retval, impl_size, impl_value},
  point::Point,
  scalar::Scalar,
  token_id::TokenId,
};
use serde::{Deserialize, Serialize};
use std::{
  ffi::{c_char, c_void, CStr, CString, NulError},
  fmt,
};

#[derive(Debug, PartialEq, Eq)]
pub enum Error<'a> {
  BlsctObjError(blsct_obj::Error<'a>),
  FailedToCreateUint64Vec,
  FailedToCreateCString(NulError),
  FailedToCreateRangeProofVector,
  FailedToVerifyRangeProofs(u8),
  FailedToCreateAmountRecoveryRequestVector,
  FailedToCreateDefaultTokenId,
  FailedToRecoverAmount(u8),
}

impl<'a> std::error::Error for Error<'a> {}

impl<'a> fmt::Display for Error<'a> {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Error::BlsctObjError(e) => write!(f, "BlsctObjError: {e:?}"),
      Error::FailedToCreateUint64Vec => write!(f, "Failed to create uint64_t vector"),
      Error::FailedToCreateCString(e) => write!(f, "Failed to create CString: {e:?}"),
      Error::FailedToCreateRangeProofVector => {
        write!(f, "Failed to create range proof vector")
      }
      Error::FailedToVerifyRangeProofs(e) => write!(f, "Failed to verify range proofs: {e}"),
      Error::FailedToCreateAmountRecoveryRequestVector => {
        write!(f, "Failed to create amount recovery request vector")
      }
      Error::FailedToCreateDefaultTokenId => write!(f, "Failed to create default token id"),
      Error::FailedToRecoverAmount(e) => write!(f, "Failed to recover amount: {e}"),
    }
  }
}

#[derive(Debug, Deserialize, Serialize, Eq)]
pub struct RangeProof {
  obj: BlsctObj<RangeProof, BlsctRangeProof>,
}

impl_from_retval!(RangeProof);
impl_display!(RangeProof);
impl_clone!(RangeProof);

impl RangeProof {
  pub fn new<'a>(
    amounts: &Vec<u64>,
    nonce: &Point,
    msg: &str,
    token_id: &TokenId,
  ) -> Result<Self, Error<'a>> {
    let vp_u64_vec = {
      let vec = unsafe { create_uint64_vec() };
      if vec.is_null() {
        return Err(Error::FailedToCreateUint64Vec);
      }
      for amount in amounts {
        unsafe { add_to_uint64_vec(vec, *amount) };
      }
      vec
    };
    let c_msg = CString::new(msg).map_err(Error::FailedToCreateCString)?;

    let rv =
      unsafe { build_range_proof(vp_u64_vec, nonce.value(), c_msg.as_ptr(), token_id.value()) };
    unsafe { delete_uint64_vec(vp_u64_vec) };

    let obj = BlsctObj::from_retval(rv).map_err(Error::BlsctObjError)?;
    Ok(obj.into())
  }

  pub fn verify_proofs<'a>(proofs: &Vec<RangeProof>) -> Result<bool, Error<'a>> {
    let range_proofs = unsafe { create_range_proof_vec() };
    if range_proofs.is_null() {
      return Err(Error::FailedToCreateRangeProofVector);
    }

    for proof in proofs {
      let proof_size = proof.obj.size();
      unsafe { add_to_range_proof_vec(range_proofs, proof.value(), proof_size) };
    }

    let rv = unsafe { verify_range_proofs(range_proofs) };
    let (result, value) = unsafe { ((*rv).result, (*rv).value) };
    unsafe {
      delete_range_proof_vec(range_proofs);
      free_obj(rv as *mut c_void);
    };

    if result == 0 {
      Ok(value)
    } else {
      Err(Error::FailedToVerifyRangeProofs(result))
    }
  }

  pub fn recover_amounts<'a>(
    reqs: Vec<AmountRecoveryReq>,
  ) -> Result<Vec<AmountRecoveryRes>, Error<'a>> {
    let req_vec = unsafe { create_amount_recovery_req_vec() };
    if req_vec.is_null() {
      return Err(Error::FailedToCreateAmountRecoveryRequestVector);
    }
    for req in reqs {
      let default_token_id = if req.token_id.is_none() {
        Some(TokenId::default().map_err(|_| Error::FailedToCreateDefaultTokenId)?)
      } else {
        None
      };
      let token_id = req.token_id.as_ref().or(default_token_id.as_ref()).unwrap();

      let blsct_req = unsafe {
        gen_amount_recovery_req(
          req.range_proof.value() as *mut c_void,
          req.range_proof.size(),
          req.nonce.value() as *mut c_void,
          token_id.value() as *mut c_void,
        )
      };

      unsafe { add_to_amount_recovery_req_vec(req_vec, blsct_req as *mut c_void) };
    }

    let rv = unsafe { recover_amount(req_vec) };
    unsafe { delete_amount_recovery_req_vec(req_vec) };

    let (result, value) = unsafe { ((*rv).result, (*rv).value) };
    if result != 0 {
      unsafe { free_amounts_ret_val(rv) };
      return Err(Error::FailedToRecoverAmount(result));
    }

    let mut results: Vec<AmountRecoveryRes> = vec![];
    let result_size = unsafe { get_amount_recovery_result_size(value) };

    for i in 0..result_size {
      let is_succ = unsafe { get_amount_recovery_result_is_succ(value, i) };
      let amount = unsafe { get_amount_recovery_result_amount(value, i) };
      let msg_c_str = unsafe { get_amount_recovery_result_msg(value, i) };
      let msg = if msg_c_str.is_null() {
        ""
      } else {
        unsafe { CStr::from_ptr(msg_c_str) }.to_str().unwrap()
      };
      let result = AmountRecoveryRes::new(is_succ, amount, msg);
      results.push(result);
    }

    Ok(results)
  }

  #[allow(non_snake_case)]
  pub fn get_A(&self) -> Point {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_A(self.value(), size) };
    BlsctObj::<Point, BlsctPoint>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_A_wip(&self) -> Point {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_A_wip(self.value(), size) };
    BlsctObj::<Point, BlsctPoint>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_B(&self) -> Point {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_B(self.value(), size) };
    BlsctObj::<Point, BlsctPoint>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_r_prime(&self) -> Scalar {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_r_prime(self.value(), size) };
    BlsctObj::<Scalar, BlsctScalar>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_s_prime(&self) -> Scalar {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_s_prime(self.value(), size) };
    BlsctObj::<Scalar, BlsctScalar>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_delta_prime(&self) -> Scalar {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_delta_prime(self.value(), size) };
    BlsctObj::<Scalar, BlsctScalar>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_alpha_hat(&self) -> Scalar {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_alpha_hat(self.value(), size) };
    BlsctObj::<Scalar, BlsctScalar>::from_c_obj(obj).into()
  }

  #[allow(non_snake_case)]
  pub fn get_tau_x(&self) -> Scalar {
    let size = self.obj.size();
    let obj = unsafe { get_range_proof_tau_x(self.value(), size) };
    BlsctObj::<Scalar, BlsctScalar>::from_c_obj(obj).into()
  }

  impl_size!();
  impl_value!(BlsctRangeProof);
}

impl BlsctSerde for RangeProof {
  unsafe fn serialize(ptr: *const u8, size: usize) -> *const i8 {
    serialize_range_proof(ptr as *const BlsctRangeProof, size)
  }

  unsafe fn deserialize(hex: *const c_char) -> *mut BlsctRetVal {
    let c_str = unsafe { CStr::from_ptr(hex) };
    let obj_size = c_str.to_bytes().len() / 2;
    deserialize_range_proof(hex, obj_size)
  }
}

impl From<BlsctObj<RangeProof, BlsctRangeProof>> for RangeProof {
  fn from(obj: BlsctObj<RangeProof, BlsctRangeProof>) -> RangeProof {
    RangeProof { obj }
  }
}

impl PartialEq for RangeProof {
  fn eq(&self, other: &Self) -> bool {
    self.get_A() == other.get_A()
      && self.get_B() == other.get_B()
      && self.get_r_prime() == other.get_r_prime()
      && self.get_s_prime() == other.get_s_prime()
      && self.get_delta_prime() == other.get_delta_prime()
      && self.get_alpha_hat() == other.get_alpha_hat()
      && self.get_tau_x() == other.get_tau_x()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::initializer::init;

  fn gen_range_proof() -> RangeProof {
    let values = vec![123u64];
    let nonce = Point::random().unwrap();
    let token_id = TokenId::default().unwrap();
    RangeProof::new(&values, &nonce, "navio", &token_id).unwrap()
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_A() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_A();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_A_wip() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_A_wip();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_B() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_B();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_r_prime() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_r_prime();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_s_prime() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_s_prime();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_delta_prime() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_delta_prime();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_alpha_hat() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_alpha_hat();
  }

  #[test]
  #[allow(non_snake_case)]
  fn test_get_tau_x() {
    init();
    let rp = gen_range_proof();
    let _ = rp.get_tau_x();
  }

  #[test]
  fn test_prove_and_verify() {
    init();
    let rp = gen_range_proof();
    let result = RangeProof::verify_proofs(&vec![rp]).unwrap();
    assert!(result);
  }

  #[test]
  fn test_recover_amounts() {
    init();

    let msg = "navio";
    let amount = 123u64;

    let values = vec![amount];
    let nonce = Point::random().unwrap();
    let token_id = TokenId::default().unwrap();

    let rp = RangeProof::new(&values, &nonce, msg, &token_id).unwrap();

    let req = AmountRecoveryReq::new(&rp, &nonce);
    let res = RangeProof::recover_amounts(vec![req]).unwrap();

    assert_eq!(res.len(), 1);
    assert!(res[0].is_succ);
    assert_eq!(res[0].amount, amount);
    assert_eq!(res[0].msg, msg);
  }

  #[test]
  fn test_recover_amounts_with_non_default_token() {
    init();

    let msg = "navio-token";
    let amount = 321u64;

    let values = vec![amount];
    let nonce = Point::random().unwrap();
    let token_id = TokenId::from_token_and_subid(123, 456).unwrap();

    let rp = RangeProof::new(&values, &nonce, msg, &token_id).unwrap();

    let req = AmountRecoveryReq::new_with_token_id(&rp, &nonce, &token_id);
    let res = RangeProof::recover_amounts(vec![req]).unwrap();

    assert_eq!(res.len(), 1);
    assert!(res[0].is_succ);
    assert_eq!(res[0].amount, amount);
    assert_eq!(res[0].msg, msg);
  }

  #[test]
  fn test_deser() {
    init();
    let a = gen_range_proof();
    let hex = bincode::serialize(&a).unwrap();
    let b = bincode::deserialize::<RangeProof>(&hex).unwrap();
    assert_eq!(a, b);
  }
}
