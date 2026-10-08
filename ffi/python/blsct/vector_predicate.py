from . import blsct

def parse_data_predicate_data(predicate_hex: str) -> str:
  """
  Return the payload of a DATA predicate in hex, without the operation byte
  and length prefix that frame it in predicate_hex (for example a
  stake-delegation payload, see parse_stake_delegation_owner_info). Raises
  ValueError when predicate_hex is not a DATA predicate.
  """
  rv = blsct.deserialize_vector_predicate(predicate_hex)
  rv_result = int(rv.result)
  if rv_result != 0:
    blsct.free_obj(rv)
    raise ValueError(f"Failed to deserialize vector predicate. Error code = {rv_result}")
  predicate, predicate_size = rv.value, rv.value_size
  blsct.free_obj(rv)
  try:
    rv = blsct.get_data_predicate_data(blsct.cast_to_vector_predicate(predicate), predicate_size)
    rv_result = int(rv.result)
    if rv_result != 0:
      blsct.free_obj(rv)
      raise ValueError(f"Failed to parse DATA predicate. Error code = {rv_result}")
    data_hex = "" if rv.value_size == 0 else blsct.buf_to_malloced_hex_c_str(
      blsct.cast_to_uint8_t_ptr(rv.value), rv.value_size
    )
    blsct.free_obj(rv.value)
    blsct.free_obj(rv)
    return data_hex
  finally:
    blsct.free_obj(predicate)
