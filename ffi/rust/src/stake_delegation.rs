//! Cold staking: the encrypted payload that delegates a staked output to a
//! third-party staker, and its recovery by the output's owner.

use crate::{
  blsct_obj::BlsctObj,
  ffi::{
    build_stake_delegation_data as ffi_build_stake_delegation_data,
    delete_stake_delegation_owner_info, free_obj,
    is_stake_delegation_data as ffi_is_stake_delegation_data,
    recover_stake_delegation_owner_info as ffi_recover_stake_delegation_owner_info, BlsctPoint,
    BlsctRetVal, BlsctStakeDelegationOwnerInfo,
  },
  point::Point,
  scalar::Scalar,
};
use std::{
  ffi::{c_void, CStr, CString, NulError},
  fmt,
  str::Utf8Error,
};

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
  FailedToAllocateMemory,
  FailedToCreateCString(NulError),
  FailedToBuildData(u8),
  FailedToRecoverOwnerInfo(u8),
  InvalidRewardAddress(Utf8Error),
}

impl std::error::Error for Error {}

impl fmt::Display for Error {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    match self {
      Error::FailedToAllocateMemory => write!(f, "Failed to allocate memory for BlsctRetVal"),
      Error::FailedToCreateCString(e) => write!(f, "Failed to create CString: {e:?}"),
      Error::FailedToBuildData(e) => write!(f, "Failed to build stake delegation data: {e}"),
      Error::FailedToRecoverOwnerInfo(e) => {
        write!(f, "Failed to recover stake delegation owner info: {e}")
      }
      Error::InvalidRewardAddress(e) => write!(f, "Reward address is not UTF-8: {e:?}"),
    }
  }
}

/// Whom a delegated staked output is delegated to, as its owner sees it.
#[derive(Debug, PartialEq)]
pub struct StakeDelegationOwnerInfo {
  /// The staker's public key the stake is delegated to.
  pub delegate_key: Point,
  /// Where the staker must pay the block rewards.
  pub reward_address: String,
}

/// Takes the result out of a `BlsctRetVal` and frees the struct itself.
fn take_retval(rv: *mut BlsctRetVal) -> Result<(u8, *const c_void, usize), Error> {
  if rv.is_null() {
    return Err(Error::FailedToAllocateMemory);
  }
  let taken = unsafe { ((*rv).result, (*rv).value, (*rv).value_size) };
  unsafe { free_obj(rv as *mut c_void) };
  Ok(taken)
}

/// Builds a stake-delegation payload for a staked output whose commitment
/// opens to (`value`, `gamma`), ready to attach as the output's DATA
/// predicate. `nonce` is the output's BLSCT nonce: the destination view key
/// times the output's blinding key.
pub fn build_stake_delegation_data(
  value: u64,
  gamma: &Scalar,
  reward_address: &str,
  delegate_key: &Point,
  nonce: &Point,
) -> Result<Vec<u8>, Error> {
  let reward_address = CString::new(reward_address).map_err(Error::FailedToCreateCString)?;
  let rv = unsafe {
    ffi_build_stake_delegation_data(
      value,
      gamma.value(),
      reward_address.as_ptr(),
      delegate_key.value(),
      nonce.value(),
    )
  };
  let (result, data, size) = take_retval(rv)?;
  if result != 0 {
    return Err(Error::FailedToBuildData(result));
  }
  let bytes = if size == 0 {
    Vec::new()
  } else {
    unsafe { std::slice::from_raw_parts(data as *const u8, size) }.to_vec()
  };
  unsafe { free_obj(data as *mut c_void) };
  Ok(bytes)
}

/// Returns whether `data`, the payload of a DATA predicate (not the serialized
/// predicate), looks like a stake-delegation payload. A cheap filter to run
/// before [`recover_stake_delegation_owner_info`] while syncing.
pub fn is_stake_delegation_data(data: &[u8]) -> bool {
  unsafe { ffi_is_stake_delegation_data(data.as_ptr(), data.len()) }
}

/// Recovers the staker key and reward address from a stake-delegation
/// payload, as the owner of the delegated output. `nonce` is the output's
/// blinding key times the owner's view key. Fails when `data` is not a
/// delegation payload or the nonce does not open it.
pub fn recover_stake_delegation_owner_info(
  data: &[u8],
  nonce: &Point,
) -> Result<StakeDelegationOwnerInfo, Error> {
  let rv =
    unsafe { ffi_recover_stake_delegation_owner_info(data.as_ptr(), data.len(), nonce.value()) };
  let (result, value, _) = take_retval(rv)?;
  if result != 0 {
    return Err(Error::FailedToRecoverOwnerInfo(result));
  }
  let owner_info = value as *const BlsctStakeDelegationOwnerInfo;
  // Both fields live inside owner_info, so copy them out before it is freed.
  let delegate_key: Point =
    BlsctObj::<Point, BlsctPoint>::copy_from_c_obj(unsafe { &(*owner_info).delegate_key }).into();
  let reward_address = unsafe { CStr::from_ptr((*owner_info).reward_address) }
    .to_str()
    .map(str::to_owned);
  unsafe { delete_stake_delegation_owner_info(value as *mut c_void) };

  Ok(StakeDelegationOwnerInfo {
    delegate_key,
    reward_address: reward_address.map_err(Error::InvalidRewardAddress)?,
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::initializer::init;

  const STAKE: u64 = 1_000_000_000_000;

  #[test]
  fn test_payload_opens_to_its_owner() {
    init();
    let delegate_key = Point::random().unwrap();
    let nonce = Point::random().unwrap();
    let gamma = Scalar::random().unwrap();
    let data =
      build_stake_delegation_data(STAKE, &gamma, "reward-address", &delegate_key, &nonce).unwrap();

    assert!(is_stake_delegation_data(&data));
    let info = recover_stake_delegation_owner_info(&data, &nonce).unwrap();
    assert!(info.delegate_key == delegate_key);
    assert_eq!(info.reward_address, "reward-address");
  }

  #[test]
  fn test_payload_does_not_open_with_another_nonce() {
    init();
    let gamma = Scalar::random().unwrap();
    let data = build_stake_delegation_data(
      STAKE,
      &gamma,
      "reward-address",
      &Point::random().unwrap(),
      &Point::random().unwrap(),
    )
    .unwrap();
    assert!(recover_stake_delegation_owner_info(&data, &Point::random().unwrap()).is_err());
  }

  #[test]
  fn test_other_data_is_not_a_payload() {
    init();
    assert!(!is_stake_delegation_data(&[0x00, 0xff]));
    assert!(!is_stake_delegation_data(&[]));
    assert!(recover_stake_delegation_owner_info(&[0x00, 0xff], &Point::random().unwrap()).is_err());
  }

  #[test]
  fn test_empty_reward_address_is_refused() {
    init();
    let gamma = Scalar::random().unwrap();
    let result = build_stake_delegation_data(
      STAKE,
      &gamma,
      "",
      &Point::random().unwrap(),
      &Point::random().unwrap(),
    );
    assert_eq!(result, Err(Error::FailedToBuildData(1)));
  }
}
