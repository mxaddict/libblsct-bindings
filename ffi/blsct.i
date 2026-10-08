%constant size_t DOUBLE_PUBLIC_KEY_SIZE = DOUBLE_PUBLIC_KEY_SIZE;
%constant size_t KEY_ID_SIZE = KEY_ID_SIZE;
%constant size_t POINT_SIZE = POINT_SIZE;
%constant size_t PUBLIC_KEY_SIZE = PUBLIC_KEY_SIZE;
%constant size_t SCRIPT_SIZE = SCRIPT_SIZE;
%constant size_t SIGNATURE_SIZE = SIGNATURE_SIZE;
%constant size_t SUB_ADDR_ID_SIZE = SUB_ADDR_ID_SIZE;
%constant size_t CTX_ID_SIZE = CTX_ID_SIZE;
%constant size_t UINT256_SIZE = UINT256_SIZE;
%constant size_t BLSCT_IN_AMOUNT_ERROR = BLSCT_IN_AMOUNT_ERROR;
%constant size_t BLSCT_OUT_AMOUNT_ERROR = BLSCT_OUT_AMOUNT_ERROR;

%inline %{
  BlsctDoublePubKey* cast_to_dpk(void* x) {
    return static_cast<BlsctDoublePubKey*>(x);
  }

  BlsctKeyId* cast_to_key_id(void* x) {
    return static_cast<BlsctKeyId*>(x);
  }

  BlsctOutPoint* cast_to_out_point(void* x) {
    return static_cast<BlsctOutPoint*>(x);
  }

  BlsctPoint* cast_to_point(void* x) {
    return static_cast<BlsctPoint*>(x);
  }

  BlsctPubKey* cast_to_pub_key(void* x) {
    return static_cast<BlsctPubKey*>(x);
  }

  BlsctRangeProof* cast_to_range_proof(void* x) {
    return static_cast<BlsctRangeProof*>(x);
  }

  BlsctScalar* cast_to_scalar(void* x) {
    return static_cast<BlsctScalar*>(x);
  }

  BlsctSignature* cast_to_signature(void* x) {
    return static_cast<BlsctSignature*>(x);
  }

  BlsctSubAddr* cast_to_sub_addr(void* x) {
    return static_cast<BlsctSubAddr*>(x);
  }

  BlsctSubAddrId* cast_to_sub_addr_id(void* x) {
    return static_cast<BlsctSubAddrId*>(x);
  }

  BlsctTokenId* cast_to_token_id(void* x) {
    return static_cast<BlsctTokenId*>(x);
  }

  BlsctUint256* cast_to_uint256(void* x) {
    return static_cast<BlsctUint256*>(x);
  }

  BlsctVectorPredicate* cast_to_vector_predicate(void* x) {
    return static_cast<BlsctVectorPredicate*>(x);
  }

  CTxIn* cast_to_ctx_in(void* x) {
    return static_cast<CTxIn*>(x);
  }

  CTxOut* cast_to_ctx_out(void* x) {
    return static_cast<CTxOut*>(x);
  }

  BlsctTxIn* cast_to_tx_in(void* x) {
    return static_cast<BlsctTxIn*>(x);
  }

  BlsctTxOut* cast_to_tx_out(void* x) {
    return static_cast<BlsctTxOut*>(x);
  }

  uint8_t* cast_to_uint8_t_ptr(void* x) {
    return static_cast<uint8_t*>(x);
  }

  CScript* cast_to_cscript(void* x) {
    return static_cast<CScript*>(x);
  }

  BlsctScript* cast_to_script(void* x) {
    return static_cast<BlsctScript*>(x);
  }

  BlsctAmountRecoveryReq* cast_to_amount_recovery_req(void* x) {
    return static_cast<BlsctAmountRecoveryReq*>(x);
  }

  size_t cast_to_size_t(uint64_t x) {
    return static_cast<size_t>(x);
  }

  const char* cast_to_const_char_ptr(void* str_buf) {
    return static_cast<const char*>(str_buf);
  }

  void* get_amount_recovery_result_gamma_ptr(
      void* vp_amt_recovery_req_vec,
      size_t idx) {
    if (vp_amt_recovery_req_vec == nullptr) {
      return nullptr;
    }
    auto vec = static_cast<std::vector<BlsctAmountRecoveryResult>*>(vp_amt_recovery_req_vec);
    return static_cast<void*>(&vec->at(idx).gamma);
  }

  // Field readers for the BlsctStakeDelegationOwnerInfo that
  // recover_stake_delegation_owner_info returns. Both point into the struct,
  // so copy them before delete_stake_delegation_owner_info.
  const BlsctPoint* get_stake_delegation_owner_info_delegate_key(const void* vp_owner_info) {
    return &static_cast<const BlsctStakeDelegationOwnerInfo*>(vp_owner_info)->delegate_key;
  }

  const char* get_stake_delegation_owner_info_reward_address(const void* vp_owner_info) {
    return static_cast<const BlsctStakeDelegationOwnerInfo*>(vp_owner_info)->reward_address;
  }
%}

%include "stdint.i"

#define BLSCT_RESULT uint8_t

export enum BlsctChain {
    Mainnet,
    Testnet,
    Signet,
    Regtest,
};

export enum AddressEncoding {
    Bech32,
    Bech32M
};

export enum TxOutputType {
    Normal,
    StakedCommitment
};

export enum BlsctTokenType {
    BlsctToken,
    BlsctNft
};

export enum BlsctPredicateType {
    BlsctCreateTokenPredicateType,
    BlsctMintTokenPredicateType,
    BlsctMintNftPredicateType,
    BlsctPayFeePredicateType,
    BlsctDataPredicateType,
    BlsctInvalidPredicateType
};

// Prevent SWIG from generating C++ delete destructors for these
// malloc-allocated structs (malloc/delete mismatch is UB and corrupts
// the heap on macOS). Memory is managed by free_obj / free_amounts_ret_val.
%nodefaultdtor BlsctRetVal;
%nodefaultdtor BlsctBoolRetVal;
%nodefaultdtor BlsctAmountsRetVal;
%nodefaultdtor BlsctCTxRetVal;

typedef struct {
  BLSCT_RESULT result;
  void* value;
  size_t value_size;
} BlsctRetVal;

typedef struct {
  BLSCT_RESULT result;
  bool value;
} BlsctBoolRetVal;

typedef struct {
  BLSCT_RESULT result;
  void* value;
} BlsctAmountsRetVal;

typedef struct {
  BLSCT_RESULT result;
  void* ctx;
  size_t in_amount_err_index;
  size_t out_amount_err_index;
} BlsctCTxRetVal;

export void free_obj(void* rv);
export void free_amounts_ret_val(BlsctAmountsRetVal* rv);
export void init();

export enum BlsctChain get_blsct_chain();
export void set_blsct_chain(enum BlsctChain chain);

// address
export BlsctRetVal* decode_address(
  const char* blsct_enc_addr
);

export BlsctRetVal* encode_address(
  const void* void_blsct_dpk,
  const enum AddressEncoding encoding
);

// amount recovery request
export BlsctAmountRecoveryReq* gen_amount_recovery_req(
    const void* vp_blsct_range_proof,
    const size_t range_proof_size,
    const void* vp_blsct_nonce,
    const void* vp_blsct_token_id
);
export void* create_amount_recovery_req_vec();
export void add_to_amount_recovery_req_vec(
    void* vp_amt_recovery_req_vec,
    void* vp_amt_recovery_req
);
export void delete_amount_recovery_req_vec(void* vp_amt_recovery_req_vec);

// amount recovery and the result
export BlsctAmountsRetVal* recover_amount(
    void* vp_amt_recovery_req_vec
);
export size_t get_amount_recovery_result_size(
    void* vp_amt_recovery_res_vec
);
export bool get_amount_recovery_result_is_succ(
    void* vp_amt_recovery_req_vec,
    size_t idx
);
export uint64_t get_amount_recovery_result_amount(
    void* vp_amt_recovery_req_vec,
    size_t idx
);
export const char* get_amount_recovery_result_msg(
    void* vp_amt_recovery_req_vec,
    size_t idx
);
export const BlsctScalar* get_amount_recovery_result_gamma(
    void* vp_amt_recovery_req_vec,
    size_t idx
);

// ctx
export void* create_tx_in_vec();
export void add_to_tx_in_vec(void* vp_tx_in_vec, const BlsctTxIn* tx_in);
export void delete_tx_in_vec(void* vp_tx_in_vec);

export void* create_tx_out_vec();
export void add_to_tx_out_vec(void* vp_tx_out_vec, const BlsctTxOut* tx_out);
export void delete_tx_out_vec(void* vp_tx_out_vec);

export BlsctCTxRetVal* build_ctx(
    const void* void_tx_ins,
    const void* void_tx_outs
);
export BlsctCTxRetVal* build_ctx_with_change(
    const void* void_tx_ins,
    const void* void_tx_outs,
    const BlsctSubAddr* change_addr
);
// using void* instead of const void* to avoid const_cast
export const char* get_ctx_id(void* vp_ctx);
export const void* get_ctx_ins(void* vp_ctx);
export const void* get_ctx_outs(void* vp_ctx);
export const char* serialize_ctx(void* vp_ctx);
export BlsctRetVal* deserialize_ctx(const char* hex);
export void delete_ctx(void* vp_ctx);

// ctx id
export const char* serialize_ctx_id(const BlsctCTxId* blsct_ctx_id);
export BlsctRetVal* deserialize_ctx_id(const char* hex);

// signed transaction aggregation
export void* create_tx_hex_vec();
export void add_to_tx_hex_vec(void* vp_tx_hex_vec, const char* tx_hex);
export void delete_tx_hex_vec(void* vp_tx_hex_vec);
export BlsctRetVal* aggregate_transactions(const void* vp_tx_hex_vec);

// ctx_ins
export bool are_ctx_ins_equal(const void* vp_a, const void* vp_b);
export size_t get_ctx_ins_size(const void* blsct_ctx_ins);
export const void* get_ctx_in_at(const void* vp_ctx_ins, const size_t i);

// ctx in
export bool are_ctx_in_equal(const void* vp_a, const void* vp_b);
export const BlsctCTxId* get_ctx_in_prev_out_hash(const void* vp_ctx_in);
export const BlsctScript* get_ctx_in_script_sig(const void* vp_ctx_in);
export uint32_t get_ctx_in_sequence(const void* vp_ctx_in);
export const BlsctScript* get_ctx_in_script_witness(const void* vp_ctx_in);

// ctx_outs
export bool are_ctx_outs_equal(const void* vp_a, const void* vp_b);
export size_t get_ctx_outs_size(const void* vp_ctx_outs);
export const void* get_ctx_out_at(const void* vp_ctx_outs, const size_t i);

// ctx out
export bool are_ctx_out_equal(const void* vp_a, const void* vp_b);
export uint64_t get_ctx_out_value(const void* vp_ctx_out);
export const BlsctScript* get_ctx_out_script_pub_key(const void* vp_ctx_out);
// The whole scriptPubKey in hex. BlsctScript above holds only SCRIPT_SIZE
// bytes, which cuts off longer scripts such as a staked commitment's.
export const char* get_ctx_out_script_pub_key_hex(const void* vp_ctx_out);
export const BlsctTokenId* get_ctx_out_token_id(const void* vp_ctx_out);
export BlsctRetVal* get_ctx_out_vector_predicate(const void* vp_ctx_out);

// ctx out blsct data
export const BlsctPoint* get_ctx_out_spending_key(const void* vp_ctx_out);
export const BlsctPoint* get_ctx_out_ephemeral_key(const void* vp_jctx_out);
export const BlsctPoint* get_ctx_out_blinding_key(const void* vp_ctx_out);
export const BlsctRetVal* get_ctx_out_range_proof(const void* vp_ctx_out);
export uint16_t get_ctx_out_view_tag(const void* vp_ctx_out);

// double public key
export BlsctRetVal* gen_double_pub_key(
  const BlsctPubKey* blsct_pk1,
  const BlsctPubKey* blsct_pk2
);

export BlsctDoublePubKey* gen_dpk_with_keys_acct_addr(
    const BlsctScalar* blsct_view_key,
    const BlsctPubKey* blsct_spending_pub_key,
    const int64_t account,
    const uint64_t address
);

export BlsctRetVal* dpk_to_sub_addr(
    const BlsctDoublePubKey* blsct_dpk
);

export const char* serialize_dpk(const BlsctDoublePubKey* blsct_dpk);
export BlsctRetVal* deserialize_dpk(const char* hex);

// key id (=Hash ID)
export BlsctKeyId* calc_key_id(
    const BlsctPubKey* blsct_blinding_pub_key,
    const BlsctPubKey* blsct_spending_pub_key,
    const BlsctScalar* blsct_view_key
);

export const char* serialize_key_id(
  const BlsctKeyId* blsct_key_id
);

export BlsctRetVal* deserialize_key_id(
    const char* hex
);

// out point
export BlsctRetVal* gen_out_point(
    const char* ctx_id_c_str
);

export const char* serialize_out_point(const BlsctOutPoint* blsct_out_point);
export BlsctRetVal* deserialize_out_point(const char* hex);

// point
export int are_point_equal(const BlsctPoint* a, const BlsctPoint* b);
export BlsctRetVal* gen_base_point();
export BlsctRetVal* gen_random_point();

export BlsctPoint* scalar_muliply_point( // fix type after next navio-core is released
    const BlsctPoint* blsct_point,
    const BlsctScalar* blsct_scalar
);
export const char* point_to_str(const BlsctPoint* blsct_point);
export BlsctPoint* point_from_scalar(const BlsctScalar* blsct_scalar);
export bool is_valid_point(const BlsctPoint* blsct_point);

export const char* serialize_point(const BlsctPoint* blsct_point);
export BlsctRetVal* deserialize_point(const char* hex);

// public key
export BlsctRetVal* gen_random_public_key();
export BlsctPoint* get_public_key_point(const BlsctPubKey* blsct_pub_key);
export BlsctPubKey* point_to_public_key(const BlsctPoint* blsct_point);

export const char* serialize_public_key(const BlsctPoint* blsct_point);
export BlsctRetVal* deserialize_public_key(const char* hex);

// range proof
export BlsctRetVal* build_range_proof(
  const void* vp_uint64_vec,
  const BlsctPoint* blsct_nonce,
  const char* blsct_msg,
  const BlsctTokenId* blsct_token_id
);

export BlsctBoolRetVal* verify_range_proofs(
  const void* vp_range_proofs
);

// Verify range proofs under an explicit transcript version, for callers that
// already know it (e.g. from the containing transaction's BLSCT_PROOF_V2_MARKER).
export BlsctBoolRetVal* verify_range_proofs_with_transcript(
  const void* vp_range_proofs,
  const bool transcript_v2
);

export BlsctPoint* get_range_proof_A(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);
export BlsctPoint* get_range_proof_A_wip(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);
export BlsctPoint* get_range_proof_B(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);

export BlsctScalar* get_range_proof_r_prime(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);
export BlsctScalar* get_range_proof_s_prime(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);
export BlsctScalar* get_range_proof_delta_prime(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);
export BlsctScalar* get_range_proof_alpha_hat(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);
export BlsctScalar* get_range_proof_tau_x(const BlsctRangeProof* blsct_range_proof, const size_t range_proof_size);

export void* create_range_proof_vec();
export void add_to_range_proof_vec(
    void* vp_range_proofs,
    const BlsctRangeProof* blsct_range_proof,
    size_t blsct_range_proof_size
);
export void delete_range_proof_vec(const void* vp_range_proofs);

export const char* serialize_range_proof(
    const BlsctRangeProof* blsct_range_proof,
    const size_t obj_size
);
export BlsctRetVal* deserialize_range_proof(
    const char* hex,
    const size_t obj_size
);

// scalar
export int are_scalar_equal(const BlsctScalar* a, const BlsctScalar* b);
export BlsctRetVal* gen_random_scalar();
export BlsctRetVal* gen_scalar(const uint64_t n);
export uint64_t scalar_to_uint64(const BlsctScalar* blsct_scalar);
export const char* scalar_to_str(const BlsctScalar* blsct_scalar);
export BlsctPubKey* scalar_to_pub_key(const BlsctScalar* blsct_scalar);

export const char* serialize_scalar(const BlsctScalar* blsct_scalar);
export BlsctRetVal* deserialize_scalar(const char* hex);

// script
export const char* serialize_script(const BlsctScript* blsct_script);
export BlsctRetVal* deserialize_script(const char* hex);

// signature
export const BlsctSignature* sign_message(
    const BlsctScalar* blsct_priv_key,
    const char* blsct_msg
);

export bool verify_msg_sig(
    const BlsctPubKey* blsct_pub_key,
    const char* blsct_msg,
    const BlsctSignature* blsct_signature
);

export const char* serialize_signature(const BlsctSignature* blsct_signature);
export BlsctRetVal* deserialize_signature(const char* hex);

// sub addr
export BlsctSubAddr* derive_sub_address(
    const BlsctScalar* blsct_view_key,
    const BlsctPubKey* blsct_spending_pub_key,
    const BlsctSubAddrId* blsct_sub_addr_id
);
export BlsctDoublePubKey* sub_addr_to_dpk(
    const BlsctSubAddr* blsct_sub_addr
);
export const char* serialize_sub_addr(const BlsctSubAddr* blsct_sub_addr);
export BlsctRetVal* deserialize_sub_addr(const char* hex);

// sub addr id
export BlsctSubAddrId* gen_sub_addr_id(
    const int64_t account,
    const uint64_t address
);

export int64_t get_sub_addr_id_account(
    const BlsctSubAddrId* blsct_sub_addr_id
);

export uint64_t get_sub_addr_id_address(
    const BlsctSubAddrId* blsct_sub_addr_id
);

export const char* serialize_sub_addr_id(const BlsctSubAddrId* blsct_sub_addr_id);
export BlsctRetVal* deserialize_sub_addr_id(const char* hex);

// token id
export BlsctRetVal* gen_token_id_with_token_and_subid(
  const uint64_t token,
  const uint64_t subid
);

export BlsctRetVal* gen_token_id(
  const uint64_t token
);

export BlsctRetVal* gen_default_token_id();
export uint64_t get_token_id_token(const BlsctTokenId* blsct_token_id);
export uint64_t get_token_id_subid(const BlsctTokenId* blsct_token_id);

export const char* serialize_token_id(const BlsctTokenId* blsct_token_id);
export BlsctRetVal* deserialize_token_id(const char* hex);

// generic string map helpers
export void* create_string_map();
export void add_to_string_map(void* vp_string_map, const char* key, const char* value);
export void delete_string_map(const void* vp_string_map);
export size_t get_string_map_size(const void* vp_string_map);
export const char* get_string_map_key_at(const void* vp_string_map, size_t idx);
export const char* get_string_map_value_at(const void* vp_string_map, size_t idx);

// token info helpers
export BlsctRetVal* build_token_info(
    const BlsctTokenType type,
    const BlsctPubKey* blsct_public_key,
    const void* vp_metadata,
    const uint64_t total_supply
);
export void delete_token_info(void* vp_token_info);
export const char* serialize_token_info(const void* vp_token_info);
export BlsctRetVal* deserialize_token_info(const char* hex);
export BlsctTokenType get_token_info_type(const void* vp_token_info);
export const BlsctPubKey* get_token_info_public_key(const void* vp_token_info);
export uint64_t get_token_info_total_supply(const void* vp_token_info);
export void* get_token_info_metadata(const void* vp_token_info);

// collection token hash and token key derivation
export BlsctRetVal* calc_collection_token_hash(
    const void* vp_metadata,
    const uint64_t total_supply
);
export BlsctRetVal* derive_collection_token_key(
    const BlsctScalar* blsct_master_token_key,
    const BlsctUint256* blsct_collection_token_hash
);
export const BlsctPubKey* derive_collection_token_public_key(
    const BlsctScalar* blsct_master_token_key,
    const BlsctUint256* blsct_collection_token_hash
);

// tx in
export BlsctRetVal* build_tx_in(
    const uint64_t amount,
    const BlsctScalar* gamma,
    const BlsctScalar* spendingKey,
    const BlsctTokenId* tokenId,
    const BlsctOutPoint* outPoint,
    const bool staked_commitment,
    const bool rbf
);

export uint64_t get_tx_in_amount(const BlsctTxIn* tx_in);
export const BlsctScalar* get_tx_in_gamma(const BlsctTxIn* tx_in);
export const BlsctScalar* get_tx_in_spending_key(const BlsctTxIn* tx_in);
export const BlsctTokenId* get_tx_in_token_id(const BlsctTxIn* tx_in);
export const BlsctOutPoint* get_tx_in_out_point(const BlsctTxIn* tx_in);
export bool get_tx_in_staked_commitment(const BlsctTxIn* tx_in);
export bool get_tx_in_rbf(const BlsctTxIn* tx_in);

// tx out
// The memo crosses as one string argument; SWIG passes its UTF-8 byte length
// alongside, so core can reject an embedded NUL instead of truncating there.
%apply (const char *STRING, size_t LENGTH) { (const char* memo, size_t memo_len) };
export BlsctRetVal* build_tx_out(
    const BlsctSubAddr* blsct_dest,
    const uint64_t amount,
    const char* memo,
    size_t memo_len,
    const BlsctTokenId* blsct_token_id,
    const TxOutputType output_type,
    const uint64_t min_stake,
    const bool subtract_fee_from_amount,
    const BlsctScalar* blsct_blinding_key
);

export const BlsctSubAddr* get_tx_out_destination(const BlsctTxOut* tx_out);
export uint64_t get_tx_out_amount(const BlsctTxOut* tx_out);
export const char* get_tx_out_memo(const BlsctTxOut* tx_out);
export const BlsctTokenId* get_tx_out_token_id(const BlsctTxOut* tx_out);
export TxOutputType get_tx_out_output_type(const BlsctTxOut* tx_out);
export uint64_t get_tx_out_min_stake(const BlsctTxOut* tx_out);
export bool get_tx_out_subtract_fee_from_amount(const BlsctTxOut* tx_out);
export const BlsctScalar* get_tx_out_blinding_key(const BlsctTxOut* tx_out);
// Request the v2 transcript for this output's range proof. Set true when the
// output is for a transaction at or above the transcript-v2 activation height;
// the assembled transaction then carries BLSCT_PROOF_V2_MARKER automatically.
export void set_tx_out_transcript_v2(BlsctTxOut* tx_out, const bool transcript_v2);
export bool get_tx_out_transcript_v2(const BlsctTxOut* tx_out);

// vector predicate
export int are_vector_predicate_equal(
    const BlsctVectorPredicate* a,
    const size_t a_size,
    const BlsctVectorPredicate* b,
    const size_t b_size
);
export const char* serialize_vector_predicate(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export BlsctRetVal* deserialize_vector_predicate(
  const char* hex
);
export BlsctPredicateType get_vector_predicate_type(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export BlsctRetVal* build_create_token_predicate(
  const void* vp_token_info
);
export BlsctRetVal* build_mint_token_predicate(
  const BlsctPubKey* blsct_token_public_key,
  const uint64_t amount
);
export BlsctRetVal* build_mint_nft_predicate(
  const BlsctPubKey* blsct_token_public_key,
  const uint64_t nft_id,
  const void* vp_metadata
);
export BlsctRetVal* get_create_token_predicate_token_info(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export const BlsctPubKey* get_mint_token_predicate_public_key(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export uint64_t get_mint_token_predicate_amount(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export const BlsctPubKey* get_mint_nft_predicate_public_key(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export uint64_t get_mint_nft_predicate_nft_id(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
export void* get_mint_nft_predicate_metadata(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);
// The payload of a DATA predicate, without its operation byte and length
// prefix; fails when the predicate is not DATA.
export BlsctRetVal* get_data_predicate_data(
  const BlsctVectorPredicate* blsct_vector_predicate,
  size_t obj_size
);

// unsigned input/output/transaction helpers
export BlsctRetVal* build_unsigned_input(const BlsctTxIn* tx_in);
export void delete_unsigned_input(void* vp_unsigned_input);
export const char* serialize_unsigned_input(const void* vp_unsigned_input);
export BlsctRetVal* deserialize_unsigned_input(const char* hex);

export BlsctRetVal* build_unsigned_output(const BlsctTxOut* tx_out);
export BlsctRetVal* build_unsigned_create_token_output(
  const BlsctScalar* blsct_token_key,
  const void* vp_token_info
);
export BlsctRetVal* build_unsigned_mint_token_output(
  const BlsctSubAddr* blsct_dest,
  const uint64_t amount,
  const BlsctScalar* blsct_blinding_key,
  const BlsctScalar* blsct_token_key,
  const BlsctPubKey* blsct_token_public_key
);
// Same, but builds the mint output's range proof under the requested proof
// transcript (transcript_v2=true at/above the network's activation height).
export BlsctRetVal* build_unsigned_mint_token_output_with_transcript(
  const BlsctSubAddr* blsct_dest,
  const uint64_t amount,
  const BlsctScalar* blsct_blinding_key,
  const BlsctScalar* blsct_token_key,
  const BlsctPubKey* blsct_token_public_key,
  const bool transcript_v2
);
export BlsctRetVal* build_unsigned_mint_nft_output(
  const BlsctSubAddr* blsct_dest,
  const BlsctScalar* blsct_blinding_key,
  const BlsctScalar* blsct_token_key,
  const BlsctPubKey* blsct_token_public_key,
  const uint64_t nft_id,
  const void* vp_metadata
);
export void delete_unsigned_output(void* vp_unsigned_output);
export const char* serialize_unsigned_output(const void* vp_unsigned_output);
export BlsctRetVal* deserialize_unsigned_output(const char* hex);

export void* create_unsigned_transaction();
export void add_unsigned_transaction_input(void* vp_unsigned_transaction, const void* vp_unsigned_input);
export void add_unsigned_transaction_output(void* vp_unsigned_transaction, const void* vp_unsigned_output);
export void set_unsigned_transaction_fee(void* vp_unsigned_transaction, const uint64_t fee);
export uint64_t get_unsigned_transaction_fee(const void* vp_unsigned_transaction);
export size_t get_unsigned_transaction_inputs_size(const void* vp_unsigned_transaction);
export size_t get_unsigned_transaction_outputs_size(const void* vp_unsigned_transaction);
export void delete_unsigned_transaction(void* vp_unsigned_transaction);
export const char* serialize_unsigned_transaction(const void* vp_unsigned_transaction);
export BlsctRetVal* deserialize_unsigned_transaction(const char* hex);
export BlsctRetVal* sign_unsigned_transaction(const void* vp_unsigned_transaction);

// key derivation functions

// from seed
export BlsctScalar* from_seed_to_child_key(
    const BlsctScalar* blsct_seed
);

// from child key
export BlsctScalar* from_child_key_to_blinding_key(
    const BlsctScalar* blsct_child_key
);

export BlsctScalar* from_child_key_to_token_key(
    const BlsctScalar* blsct_child_key
);

export BlsctScalar* from_child_key_to_tx_key(
    const BlsctScalar* blsct_child_key
);

// from tx key
export BlsctScalar* from_tx_key_to_view_key(
    const BlsctScalar* blsct_tx_key
);

export BlsctScalar* from_tx_key_to_spending_key(
    const BlsctScalar* blsct_tx_key
);

// from multiple keys and other info
export BlsctScalar* calc_priv_spending_key(
    const BlsctPubKey* blsct_blinding_pub_key,
    const BlsctScalar* blsct_view_key,
    const BlsctScalar* blsct_spending_key,
    const int64_t account,
    const uint64_t address
);

// blsct/wallet/helpers delegators
export uint64_t calc_view_tag(
    const BlsctPubKey* blinding_pub_key,
    const BlsctScalar* view_key
);

export BlsctPoint* calc_nonce(
    const BlsctPubKey* blsct_blinding_pub_key,
    const BlsctScalar* view_key
);

// stake delegation (cold staking): attach, detect and open the encrypted
// payload that delegates a staked output to a third-party staker.
export bool set_unsigned_output_stake_delegation(
    void* vp_unsigned_output,
    const BlsctSubAddr* blsct_dest,
    const BlsctPoint* blsct_delegate_key,
    const char* reward_address
);
export bool is_stake_delegation_data(const uint8_t* data, size_t data_len);
export BlsctRetVal* build_stake_delegation_data(
    uint64_t value,
    const BlsctScalar* gamma,
    const char* reward_address,
    const BlsctPoint* delegate_key,
    const BlsctPoint* nonce
);
export BlsctRetVal* recover_stake_delegation_owner_info(
    const uint8_t* data,
    size_t data_len,
    const BlsctPoint* nonce
);
export void delete_stake_delegation_owner_info(void* vp_owner_info);

// Misc helper functions
export uint8_t* hex_to_malloced_buf(const char* hex);
export const char* buf_to_malloced_hex_c_str(const uint8_t* buf, size_t size);
export void* create_uint64_vec();
export void add_to_uint64_vec(void* vp_uint64_vec, const uint64_t n);
export void delete_uint64_vec(const void* vp_vec);
