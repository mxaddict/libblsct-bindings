import re
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

from . import blsct
from .point import Point
from .scalar import Scalar

T = TypeVar("T")

_HEX_BYTES = re.compile(r"(?:[0-9a-fA-F]{2})+")

@dataclass(frozen=True)
class StakeDelegationOwnerInfo:
  """Whom a delegated staked output is delegated to, as its owner sees it."""
  delegate_key: Point
  """The staker's public key the stake is delegated to."""
  reward_address: str
  """Where the staker must pay the block rewards."""

def _with_data_buf(data_hex: str, cb: Callable[[Any, int], T]) -> T:
  # libblsct parses hex without validating it, so reject anything that is not
  # whole bytes of hex before handing it over.
  if not _HEX_BYTES.fullmatch(data_hex):
    raise ValueError("Stake delegation data must be a non-empty hex string of whole bytes")
  buf = blsct.hex_to_malloced_buf(data_hex)
  try:
    return cb(buf, len(data_hex) // 2)
  finally:
    blsct.free_obj(buf)

def build_stake_delegation_data_hex(
  value: int,
  gamma: Scalar,
  reward_address: str,
  delegate_key: Point,
  nonce: Point,
) -> str:
  """
  Build a stake-delegation payload for a staked output whose commitment opens
  to (value, gamma), ready to attach as the output's DATA predicate. The nonce
  is the output's BLSCT nonce: the destination view key times the output's
  blinding key. Returns the payload in hex.
  """
  rv = blsct.build_stake_delegation_data(value, gamma.value(), reward_address, delegate_key.value(), nonce.value())
  rv_result = int(rv.result)
  if rv_result != 0:
    blsct.free_obj(rv)
    raise ValueError(f"Failed to build stake delegation data. Error code = {rv_result}")
  data_hex = blsct.buf_to_malloced_hex_c_str(blsct.cast_to_uint8_t_ptr(rv.value), rv.value_size)
  blsct.free_obj(rv.value)
  blsct.free_obj(rv)
  return data_hex

def is_stake_delegation_data_hex(data_hex: str) -> bool:
  """
  Return whether data_hex, the payload of a DATA predicate (not the serialized
  predicate), looks like a stake-delegation payload. A cheap filter to run
  before parse_stake_delegation_owner_info while syncing.
  """
  if data_hex == "":
    return False
  return _with_data_buf(data_hex, blsct.is_stake_delegation_data)

def parse_stake_delegation_owner_info(data_hex: str, nonce: Point) -> StakeDelegationOwnerInfo:
  """
  Recover the staker key and reward address from a stake-delegation payload,
  as the owner of the delegated output. The nonce is the output's blinding key
  times the owner's view key. Raises ValueError when the payload is not a
  delegation payload or the nonce does not open it.
  """
  def recover(buf: Any, size: int) -> StakeDelegationOwnerInfo:
    rv = blsct.recover_stake_delegation_owner_info(buf, size, nonce.value())
    rv_result = int(rv.result)
    if rv_result != 0:
      blsct.free_obj(rv)
      raise ValueError(f"Failed to recover stake delegation owner info. Error code = {rv_result}")
    owner_info = rv.value
    try:
      # Both fields live inside owner_info, so copy them out before it is freed.
      delegate_key = blsct.get_stake_delegation_owner_info_delegate_key(owner_info)
      return StakeDelegationOwnerInfo(
        delegate_key=Point.deserialize(blsct.serialize_point(delegate_key)),
        reward_address=blsct.get_stake_delegation_owner_info_reward_address(owner_info),
      )
    finally:
      blsct.delete_stake_delegation_owner_info(owner_info)
      blsct.free_obj(rv)

  return _with_data_buf(data_hex, recover)
