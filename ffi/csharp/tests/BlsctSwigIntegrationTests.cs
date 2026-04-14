using System;
using System.Text.RegularExpressions;
using NavioBlsct;
using Xunit;

namespace NavioBlsct.Tests;

/// <summary>
/// Comprehensive integration tests for all SWIG-generated FFI endpoints.
/// These tests require the native libblsct shared library.
/// They are skipped automatically when LIBBLSCT_SO_PATH is not set.
/// </summary>
public sealed class BlsctSwigIntegrationTests
{
    private static bool HasNativeLib =>
        !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("LIBBLSCT_SO_PATH"));

    private static readonly Regex HexPattern = new(@"^[0-9a-f]+$", RegexOptions.IgnoreCase);

    /// <summary>Asserts RetVal succeeded (result == 0) and returns the value.</summary>
    private static SWIGTYPE_p_void AssertSuccess(BlsctRetVal rv)
    {
        Assert.NotNull(rv);
        Assert.Equal(0, rv.result);
        Assert.NotNull(rv.value);
        return rv.value;
    }

    /// <summary>Asserts BoolRetVal succeeded.</summary>
    private static bool AssertBoolSuccess(BlsctBoolRetVal rv)
    {
        Assert.NotNull(rv);
        Assert.Equal(0, rv.result);
        return rv.value;
    }

    /// <summary>Asserts CTxRetVal succeeded.</summary>
    private static SWIGTYPE_p_void AssertCtxSuccess(BlsctCTxRetVal rv)
    {
        Assert.NotNull(rv);
        Assert.Equal(0, rv.result);
        return rv.ctx;
    }

    private static void AssertValidHex(string hex)
    {
        Assert.NotNull(hex);
        Assert.NotEmpty(hex);
        Assert.Matches(HexPattern, hex);
    }

    private void SkipIfNoLib()
    {
        if (!HasNativeLib) return;
        blsct.init();
    }

    // =========================================================================
    // Init / Chain
    // =========================================================================

    [Fact]
    public void Init_DoesNotThrow()
    {
        if (!HasNativeLib) return;
        blsct.init();
    }

    [Fact]
    public void SetAndGetChain_RoundTrips()
    {
        if (!HasNativeLib) return;
        blsct.init();

        var chains = new[] { BlsctChain.Mainnet, BlsctChain.Testnet, BlsctChain.Signet, BlsctChain.Regtest };
        foreach (var chain in chains)
        {
            blsct.set_blsct_chain(chain);
            Assert.Equal(chain, blsct.get_blsct_chain());
        }

        // Restore default
        blsct.set_blsct_chain(BlsctChain.Mainnet);
    }

    // =========================================================================
    // Scalar
    // =========================================================================

    [Fact]
    public void Scalar_GenAndToUint64_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_scalar(12345);
        var val = AssertSuccess(rv);
        var scalar = blsct.cast_to_scalar(val);
        Assert.Equal(12345UL, blsct.scalar_to_uint64(scalar));
        blsct.free_obj(val);
    }

    [Fact]
    public void Scalar_Random_ProducesDifferentValues()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_random_scalar();
        var rv2 = blsct.gen_random_scalar();
        var s1 = blsct.cast_to_scalar(AssertSuccess(rv1));
        var s2 = blsct.cast_to_scalar(AssertSuccess(rv2));

        var hex1 = blsct.serialize_scalar(s1);
        var hex2 = blsct.serialize_scalar(s2);
        Assert.NotEqual(hex1, hex2);

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
    }

    [Fact]
    public void Scalar_Equals()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_scalar(1);
        var rv2 = blsct.gen_scalar(2);
        var s1 = blsct.cast_to_scalar(AssertSuccess(rv1));
        var s2 = blsct.cast_to_scalar(AssertSuccess(rv2));

        Assert.Equal(1, blsct.are_scalar_equal(s1, s1));
        Assert.Equal(0, blsct.are_scalar_equal(s1, s2));

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
    }

    [Fact]
    public void Scalar_ToString()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_scalar(42);
        var scalar = blsct.cast_to_scalar(AssertSuccess(rv));
        var str = blsct.scalar_to_str(scalar);
        Assert.NotNull(str);
        Assert.NotEmpty(str);
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void Scalar_ToPubKey()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_scalar(1);
        var scalar = blsct.cast_to_scalar(AssertSuccess(rv));
        var pk = blsct.scalar_to_pub_key(scalar);
        Assert.NotNull(pk);
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void Scalar_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_random_scalar();
        var scalar = blsct.cast_to_scalar(AssertSuccess(rv));
        var hex = blsct.serialize_scalar(scalar);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_scalar(hex);
        var scalar2 = blsct.cast_to_scalar(AssertSuccess(rv2));
        var hex2 = blsct.serialize_scalar(scalar2);
        Assert.Equal(hex, hex2);

        blsct.free_obj(rv.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Point
    // =========================================================================

    [Fact]
    public void Point_Base()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_base_point();
        var p = blsct.cast_to_point(AssertSuccess(rv));
        var hex = blsct.serialize_point(p);
        Assert.Equal("97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb", hex);
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void Point_Random_ProducesDifferentValues()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_random_point();
        var rv2 = blsct.gen_random_point();
        var hex1 = blsct.serialize_point(blsct.cast_to_point(AssertSuccess(rv1)));
        var hex2 = blsct.serialize_point(blsct.cast_to_point(AssertSuccess(rv2)));
        Assert.NotEqual(hex1, hex2);

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
    }

    [Fact]
    public void Point_FromScalar()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvS = blsct.gen_scalar(1);
        var scalar = blsct.cast_to_scalar(AssertSuccess(rvS));
        var point = blsct.point_from_scalar(scalar);
        Assert.NotNull(point);

        var rvBase = blsct.gen_base_point();
        var basePoint = blsct.cast_to_point(AssertSuccess(rvBase));
        Assert.Equal(1, blsct.are_point_equal(point, basePoint));

        blsct.free_obj(rvS.value);
        blsct.free_obj(rvBase.value);
    }

    [Fact]
    public void Point_IsValid()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_random_point();
        var p = blsct.cast_to_point(AssertSuccess(rv));
        Assert.True(blsct.is_valid_point(p));
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void Point_ScalarMultiply()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvP = blsct.gen_random_point();
        var rvS = blsct.gen_random_scalar();
        var point = blsct.cast_to_point(AssertSuccess(rvP));
        var scalar = blsct.cast_to_scalar(AssertSuccess(rvS));

        var result = blsct.scalar_muliply_point(point, scalar);
        Assert.NotNull(result);
        Assert.True(blsct.is_valid_point(result));

        blsct.free_obj(rvP.value);
        blsct.free_obj(rvS.value);
    }

    [Fact]
    public void Point_ToString()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_base_point();
        var p = blsct.cast_to_point(AssertSuccess(rv));
        var str = blsct.point_to_str(p);
        Assert.NotNull(str);
        Assert.Contains("17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb", str);
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void Point_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_random_point();
        var p = blsct.cast_to_point(AssertSuccess(rv));
        var hex = blsct.serialize_point(p);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_point(hex);
        var p2 = blsct.cast_to_point(AssertSuccess(rv2));
        Assert.Equal(1, blsct.are_point_equal(p, p2));

        blsct.free_obj(rv.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Public Key
    // =========================================================================

    [Fact]
    public void PublicKey_Random()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_random_public_key();
        var val = AssertSuccess(rv);
        Assert.NotNull(val);
        blsct.free_obj(val);
    }

    [Fact]
    public void PublicKey_PointToPublicKeyAndBack()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvP = blsct.gen_random_point();
        var point = blsct.cast_to_point(AssertSuccess(rvP));

        var pk = blsct.point_to_public_key(point);
        Assert.NotNull(pk);

        var pointBack = blsct.get_public_key_point(pk);
        Assert.NotNull(pointBack);
        Assert.Equal(1, blsct.are_point_equal(point, pointBack));

        blsct.free_obj(rvP.value);
    }

    [Fact]
    public void PublicKey_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvP = blsct.gen_random_point();
        var point = blsct.cast_to_point(AssertSuccess(rvP));
        var hex = blsct.serialize_public_key(point);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_public_key(hex);
        var point2 = blsct.cast_to_point(AssertSuccess(rv2));
        Assert.Equal(blsct.serialize_point(point), blsct.serialize_point(point2));

        blsct.free_obj(rvP.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Key Derivation
    // =========================================================================

    [Fact]
    public void KeyDerivation_FullChain()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        // seed -> childKey
        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        Assert.NotNull(childKey);

        // childKey -> blindingKey, tokenKey, txKey
        var blindingKey = blsct.from_child_key_to_blinding_key(childKey);
        Assert.NotNull(blindingKey);

        var tokenKey = blsct.from_child_key_to_token_key(childKey);
        Assert.NotNull(tokenKey);

        var txKey = blsct.from_child_key_to_tx_key(childKey);
        Assert.NotNull(txKey);

        // txKey -> viewKey, spendingKey
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        Assert.NotNull(viewKey);

        var spendingKey = blsct.from_tx_key_to_spending_key(txKey);
        Assert.NotNull(spendingKey);

        // Verify they serialize to non-empty hex
        AssertValidHex(blsct.serialize_scalar(childKey));
        AssertValidHex(blsct.serialize_scalar(blindingKey));
        AssertValidHex(blsct.serialize_scalar(tokenKey));
        AssertValidHex(blsct.serialize_scalar(txKey));
        AssertValidHex(blsct.serialize_scalar(viewKey));
        AssertValidHex(blsct.serialize_scalar(spendingKey));

        blsct.free_obj(rvSeed.value);
    }

    [Fact]
    public void KeyDerivation_IsDeterministic()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_scalar(12345);
        var rv2 = blsct.gen_scalar(12345);
        var seed1 = blsct.cast_to_scalar(AssertSuccess(rv1));
        var seed2 = blsct.cast_to_scalar(AssertSuccess(rv2));

        var child1 = blsct.from_seed_to_child_key(seed1);
        var child2 = blsct.from_seed_to_child_key(seed2);
        Assert.Equal(blsct.serialize_scalar(child1), blsct.serialize_scalar(child2));

        var txKey1 = blsct.from_child_key_to_tx_key(child1);
        var txKey2 = blsct.from_child_key_to_tx_key(child2);
        Assert.Equal(blsct.serialize_scalar(txKey1), blsct.serialize_scalar(txKey2));

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
    }

    [Fact]
    public void CalcPrivSpendingKey()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var spendingKey = blsct.from_tx_key_to_spending_key(txKey);

        var blindingPk = blsct.scalar_to_pub_key(
            blsct.from_child_key_to_blinding_key(childKey));

        var privSpendKey = blsct.calc_priv_spending_key(blindingPk, viewKey, spendingKey, 1, 2);
        Assert.NotNull(privSpendKey);
        AssertValidHex(blsct.serialize_scalar(privSpendKey));

        blsct.free_obj(rvSeed.value);
    }

    // =========================================================================
    // Sub-Address ID
    // =========================================================================

    [Fact]
    public void SubAddrId_Generate()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var id = blsct.gen_sub_addr_id(1, 2);
        Assert.NotNull(id);
        Assert.Equal(1L, blsct.get_sub_addr_id_account(id));
        Assert.Equal(2UL, blsct.get_sub_addr_id_address(id));
    }

    [Fact]
    public void SubAddrId_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var id = blsct.gen_sub_addr_id(1, 2);
        var hex = blsct.serialize_sub_addr_id(id);
        AssertValidHex(hex);

        var rv = blsct.deserialize_sub_addr_id(hex);
        var id2 = blsct.cast_to_sub_addr_id(AssertSuccess(rv));
        Assert.Equal(hex, blsct.serialize_sub_addr_id(id2));
        blsct.free_obj(rv.value);
    }

    // =========================================================================
    // Sub-Address
    // =========================================================================

    [Fact]
    public void SubAddr_DeriveAndConvert()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var spendPk = blsct.scalar_to_pub_key(blsct.from_tx_key_to_spending_key(txKey));
        var subAddrId = blsct.gen_sub_addr_id(0, 0);

        var subAddr = blsct.derive_sub_address(viewKey, spendPk, subAddrId);
        Assert.NotNull(subAddr);

        // toDoublePublicKey
        var dpk = blsct.sub_addr_to_dpk(subAddr);
        Assert.NotNull(dpk);

        blsct.free_obj(rvSeed.value);
    }

    [Fact]
    public void SubAddr_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var spendPk = blsct.scalar_to_pub_key(blsct.from_tx_key_to_spending_key(txKey));
        var subAddr = blsct.derive_sub_address(viewKey, spendPk, blsct.gen_sub_addr_id(0, 0));

        var hex = blsct.serialize_sub_addr(subAddr);
        AssertValidHex(hex);

        var rv = blsct.deserialize_sub_addr(hex);
        var subAddr2 = blsct.cast_to_sub_addr(AssertSuccess(rv));
        Assert.Equal(hex, blsct.serialize_sub_addr(subAddr2));

        blsct.free_obj(rvSeed.value);
        blsct.free_obj(rv.value);
    }

    // =========================================================================
    // Double Public Key
    // =========================================================================

    [Fact]
    public void DoublePubKey_Generate()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_random_public_key();
        var rv2 = blsct.gen_random_public_key();
        var pk1 = blsct.cast_to_pub_key(AssertSuccess(rv1));
        var pk2 = blsct.cast_to_pub_key(AssertSuccess(rv2));

        var rvDpk = blsct.gen_double_pub_key(pk1, pk2);
        AssertSuccess(rvDpk);

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
        blsct.free_obj(rvDpk.value);
    }

    [Fact]
    public void DoublePubKey_FromKeysAcctAddr()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var spendPk = blsct.scalar_to_pub_key(blsct.from_tx_key_to_spending_key(txKey));

        var dpk = blsct.gen_dpk_with_keys_acct_addr(viewKey, spendPk, 123, 456);
        Assert.NotNull(dpk);

        blsct.free_obj(rvSeed.value);
    }

    [Fact]
    public void DoublePubKey_DpkToSubAddr()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_random_public_key();
        var rv2 = blsct.gen_random_public_key();
        var pk1 = blsct.cast_to_pub_key(AssertSuccess(rv1));
        var pk2 = blsct.cast_to_pub_key(AssertSuccess(rv2));
        var rvDpk = blsct.gen_double_pub_key(pk1, pk2);
        var dpk = blsct.cast_to_dpk(AssertSuccess(rvDpk));

        var rvSa = blsct.dpk_to_sub_addr(dpk);
        AssertSuccess(rvSa);

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
        blsct.free_obj(rvDpk.value);
        blsct.free_obj(rvSa.value);
    }

    [Fact]
    public void DoublePubKey_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv1 = blsct.gen_random_public_key();
        var rv2 = blsct.gen_random_public_key();
        var pk1 = blsct.cast_to_pub_key(AssertSuccess(rv1));
        var pk2 = blsct.cast_to_pub_key(AssertSuccess(rv2));
        var rvDpk = blsct.gen_double_pub_key(pk1, pk2);
        var dpk = blsct.cast_to_dpk(AssertSuccess(rvDpk));

        var hex = blsct.serialize_dpk(dpk);
        AssertValidHex(hex);

        var rv2d = blsct.deserialize_dpk(hex);
        var dpk2 = blsct.cast_to_dpk(AssertSuccess(rv2d));
        Assert.Equal(hex, blsct.serialize_dpk(dpk2));

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
        blsct.free_obj(rvDpk.value);
        blsct.free_obj(rv2d.value);
    }

    // =========================================================================
    // Address encode/decode
    // =========================================================================

    [Fact]
    public void Address_EncodeAndDecode_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        blsct.set_blsct_chain(BlsctChain.Testnet);

        var rv1 = blsct.gen_random_public_key();
        var rv2 = blsct.gen_random_public_key();
        var pk1 = blsct.cast_to_pub_key(AssertSuccess(rv1));
        var pk2 = blsct.cast_to_pub_key(AssertSuccess(rv2));
        var rvDpk = blsct.gen_double_pub_key(pk1, pk2);
        var dpkVal = AssertSuccess(rvDpk);

        var rvEnc = blsct.encode_address(dpkVal, AddressEncoding.Bech32M);
        Assert.NotNull(rvEnc);
        Assert.Equal(0, rvEnc.result);

        // The encoded address string is in the value pointer - cast to string
        var addrStr = blsct.cast_to_const_char_ptr(rvEnc.value);
        Assert.NotNull(addrStr);
        Assert.NotEmpty(addrStr);

        // Decode back
        var rvDec = blsct.decode_address(addrStr);
        AssertSuccess(rvDec);

        // Compare DPK serializations
        var dpkOrig = blsct.cast_to_dpk(dpkVal);
        var dpkDecoded = blsct.cast_to_dpk(rvDec.value);
        Assert.Equal(blsct.serialize_dpk(dpkOrig), blsct.serialize_dpk(dpkDecoded));

        blsct.free_obj(rv1.value);
        blsct.free_obj(rv2.value);
        blsct.free_obj(rvEnc.value);
        blsct.free_obj(rvDpk.value);
        blsct.free_obj(rvDec.value);

        blsct.set_blsct_chain(BlsctChain.Mainnet);
    }

    // =========================================================================
    // Key ID (Hash ID)
    // =========================================================================

    [Fact]
    public void KeyId_CalcAndSerialize()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var blindingPk = blsct.scalar_to_pub_key(blsct.from_child_key_to_blinding_key(childKey));
        var spendPk = blsct.scalar_to_pub_key(blsct.from_tx_key_to_spending_key(txKey));

        var keyId = blsct.calc_key_id(blindingPk, spendPk, viewKey);
        Assert.NotNull(keyId);

        var hex = blsct.serialize_key_id(keyId);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_key_id(hex);
        var keyId2 = blsct.cast_to_key_id(AssertSuccess(rv2));
        Assert.Equal(hex, blsct.serialize_key_id(keyId2));

        blsct.free_obj(rvSeed.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Signature
    // =========================================================================

    [Fact]
    public void Signature_SignAndVerify()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvKey = blsct.gen_random_scalar();
        var privKey = blsct.cast_to_scalar(AssertSuccess(rvKey));
        var pubKey = blsct.scalar_to_pub_key(privKey);

        var sig = blsct.sign_message(privKey, "navio");
        Assert.NotNull(sig);

        Assert.True(blsct.verify_msg_sig(pubKey, "navio", sig));
        Assert.False(blsct.verify_msg_sig(pubKey, "wrong", sig));

        blsct.free_obj(rvKey.value);
    }

    [Fact]
    public void Signature_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvKey = blsct.gen_random_scalar();
        var privKey = blsct.cast_to_scalar(AssertSuccess(rvKey));
        var sig = blsct.sign_message(privKey, "navio");

        var hex = blsct.serialize_signature(sig);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_signature(hex);
        var sig2 = blsct.cast_to_signature(AssertSuccess(rv2));
        Assert.Equal(hex, blsct.serialize_signature(sig2));

        blsct.free_obj(rvKey.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Token ID
    // =========================================================================

    [Fact]
    public void TokenId_Default()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_default_token_id();
        var val = AssertSuccess(rv);
        var tid = blsct.cast_to_token_id(val);
        Assert.Equal(0UL, blsct.get_token_id_token(tid));
        Assert.Equal(0UL, blsct.get_token_id_subid(tid));
        blsct.free_obj(val);
    }

    [Fact]
    public void TokenId_FromToken()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_token_id(12345);
        var tid = blsct.cast_to_token_id(AssertSuccess(rv));
        Assert.Equal(12345UL, blsct.get_token_id_token(tid));
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void TokenId_FromTokenAndSubid()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_token_id_with_token_and_subid(123, 456);
        var tid = blsct.cast_to_token_id(AssertSuccess(rv));
        Assert.Equal(123UL, blsct.get_token_id_token(tid));
        Assert.Equal(456UL, blsct.get_token_id_subid(tid));
        blsct.free_obj(rv.value);
    }

    [Fact]
    public void TokenId_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rv = blsct.gen_token_id(777);
        var tid = blsct.cast_to_token_id(AssertSuccess(rv));
        var hex = blsct.serialize_token_id(tid);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_token_id(hex);
        var tid2 = blsct.cast_to_token_id(AssertSuccess(rv2));
        Assert.Equal(hex, blsct.serialize_token_id(tid2));

        blsct.free_obj(rv.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Out Point
    // =========================================================================

    [Fact]
    public void OutPoint_GenerateAndSerialize()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var ctxIdHex = new string('a', 64); // 32 bytes
        var rv = blsct.gen_out_point(ctxIdHex);
        var op = blsct.cast_to_out_point(AssertSuccess(rv));

        var hex = blsct.serialize_out_point(op);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_out_point(hex);
        var op2 = blsct.cast_to_out_point(AssertSuccess(rv2));
        Assert.Equal(hex, blsct.serialize_out_point(op2));

        blsct.free_obj(rv.value);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // ViewTag & Nonce
    // =========================================================================

    [Fact]
    public void ViewTag_Calc()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var blindingPk = blsct.scalar_to_pub_key(blsct.from_child_key_to_blinding_key(childKey));

        var tag = blsct.calc_view_tag(blindingPk, viewKey);
        // Should be deterministic
        var tag2 = blsct.calc_view_tag(blindingPk, viewKey);
        Assert.Equal(tag, tag2);

        blsct.free_obj(rvSeed.value);
    }

    [Fact]
    public void CalcNonce()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var blindingPk = blsct.scalar_to_pub_key(blsct.from_child_key_to_blinding_key(childKey));

        var nonce = blsct.calc_nonce(blindingPk, viewKey);
        Assert.NotNull(nonce);
        Assert.True(blsct.is_valid_point(nonce));

        blsct.free_obj(rvSeed.value);
    }

    // =========================================================================
    // Range Proof
    // =========================================================================

    [Fact]
    public void RangeProof_BuildAndVerify()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvNonce = blsct.gen_random_point();
        var nonce = blsct.cast_to_point(AssertSuccess(rvNonce));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));

        var uint64Vec = blsct.create_uint64_vec();
        blsct.add_to_uint64_vec(uint64Vec, 123);

        var rvRp = blsct.build_range_proof(uint64Vec, nonce, "navio", tokenId);
        var rpVal = AssertSuccess(rvRp);
        var rp = blsct.cast_to_range_proof(rpVal);

        // Verify
        var rpVec = blsct.create_range_proof_vec();
        blsct.add_to_range_proof_vec(rpVec, rp, rvRp.value_size);

        var verifyResult = blsct.verify_range_proofs(rpVec);
        Assert.True(AssertBoolSuccess(verifyResult));

        blsct.delete_range_proof_vec(rpVec);
        blsct.delete_uint64_vec(uint64Vec);
        blsct.free_obj(rvNonce.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rpVal);
    }

    [Fact]
    public void RangeProof_Accessors()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvNonce = blsct.gen_random_point();
        var nonce = blsct.cast_to_point(AssertSuccess(rvNonce));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));

        var uint64Vec = blsct.create_uint64_vec();
        blsct.add_to_uint64_vec(uint64Vec, 5000);

        var rvRp = blsct.build_range_proof(uint64Vec, nonce, "test", tokenId);
        var rpVal = AssertSuccess(rvRp);
        var rp = blsct.cast_to_range_proof(rpVal);
        var rpSize = rvRp.value_size;

        // Point accessors
        Assert.NotNull(blsct.get_range_proof_A(rp, rpSize));
        Assert.NotNull(blsct.get_range_proof_A_wip(rp, rpSize));
        Assert.NotNull(blsct.get_range_proof_B(rp, rpSize));

        // Scalar accessors
        Assert.NotNull(blsct.get_range_proof_r_prime(rp, rpSize));
        Assert.NotNull(blsct.get_range_proof_s_prime(rp, rpSize));
        Assert.NotNull(blsct.get_range_proof_delta_prime(rp, rpSize));
        Assert.NotNull(blsct.get_range_proof_alpha_hat(rp, rpSize));
        Assert.NotNull(blsct.get_range_proof_tau_x(rp, rpSize));

        blsct.delete_uint64_vec(uint64Vec);
        blsct.free_obj(rvNonce.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rpVal);
    }

    [Fact]
    public void RangeProof_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvNonce = blsct.gen_random_point();
        var nonce = blsct.cast_to_point(AssertSuccess(rvNonce));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));

        var uint64Vec = blsct.create_uint64_vec();
        blsct.add_to_uint64_vec(uint64Vec, 100);

        var rvRp = blsct.build_range_proof(uint64Vec, nonce, "test", tokenId);
        var rpVal = AssertSuccess(rvRp);
        var rp = blsct.cast_to_range_proof(rpVal);
        var rpSize = rvRp.value_size;

        var hex = blsct.serialize_range_proof(rp, rpSize);
        AssertValidHex(hex);

        var rvRp2 = blsct.deserialize_range_proof(hex, rpSize);
        var rp2 = blsct.cast_to_range_proof(AssertSuccess(rvRp2));
        Assert.Equal(hex, blsct.serialize_range_proof(rp2, rpSize));

        blsct.delete_uint64_vec(uint64Vec);
        blsct.free_obj(rvNonce.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rpVal);
        blsct.free_obj(rvRp2.value);
    }

    // =========================================================================
    // Amount Recovery
    // =========================================================================

    [Fact]
    public void AmountRecovery_RecoverAmount()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvNonce = blsct.gen_base_point();
        var nonce = blsct.cast_to_point(AssertSuccess(rvNonce));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));

        var uint64Vec = blsct.create_uint64_vec();
        blsct.add_to_uint64_vec(uint64Vec, 123);

        var rvRp = blsct.build_range_proof(uint64Vec, nonce, "space_x", tokenId);
        var rpVal = AssertSuccess(rvRp);
        var rp = blsct.cast_to_range_proof(rpVal);

        // Create recovery request - cast back to void* for the vec API
        var reqTyped = blsct.gen_amount_recovery_req(rpVal, rvRp.value_size, rvNonce.value, rvTid.value);
        Assert.NotNull(reqTyped);
        // Use cast_to_amount_recovery_req in reverse: get void* via the SWIGTYPE handle
        var reqVoid = new SWIGTYPE_p_void(SWIGTYPE_p_BlsctAmountRecoveryReq.getCPtr(reqTyped).Handle, false);

        var reqVec = blsct.create_amount_recovery_req_vec();
        blsct.add_to_amount_recovery_req_vec(reqVec, reqVoid);

        var amountsRv = blsct.recover_amount(reqVec);
        Assert.NotNull(amountsRv);
        Assert.Equal(0, amountsRv.result);

        var size = blsct.get_amount_recovery_result_size(amountsRv.value);
        Assert.True(size > 0);

        Assert.True(blsct.get_amount_recovery_result_is_succ(amountsRv.value, 0));
        Assert.Equal(123UL, blsct.get_amount_recovery_result_amount(amountsRv.value, 0));

        var msg = blsct.get_amount_recovery_result_msg(amountsRv.value, 0);
        Assert.Equal("space_x", msg);

        var gamma = blsct.get_amount_recovery_result_gamma(amountsRv.value, 0);
        Assert.NotNull(gamma);

        blsct.delete_amount_recovery_req_vec(reqVec);
        blsct.free_amounts_ret_val(amountsRv);
        blsct.delete_uint64_vec(uint64Vec);
        blsct.free_obj(rvNonce.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rpVal);
    }

    [Fact]
    public void AmountRecovery_WithNonDefaultTokenId()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvNonce = blsct.gen_base_point();
        var nonce = blsct.cast_to_point(AssertSuccess(rvNonce));
        var rvTid = blsct.gen_token_id(777);
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));

        var uint64Vec = blsct.create_uint64_vec();
        blsct.add_to_uint64_vec(uint64Vec, 321);

        var rvRp = blsct.build_range_proof(uint64Vec, nonce, "fungible-token", tokenId);
        var rpVal = AssertSuccess(rvRp);

        var reqTyped2 = blsct.gen_amount_recovery_req(rpVal, rvRp.value_size, rvNonce.value, rvTid.value);
        var reqVoid2 = new SWIGTYPE_p_void(SWIGTYPE_p_BlsctAmountRecoveryReq.getCPtr(reqTyped2).Handle, false);
        var reqVec = blsct.create_amount_recovery_req_vec();
        blsct.add_to_amount_recovery_req_vec(reqVec, reqVoid2);

        var amountsRv = blsct.recover_amount(reqVec);
        Assert.Equal(0, amountsRv.result);
        Assert.True(blsct.get_amount_recovery_result_is_succ(amountsRv.value, 0));
        Assert.Equal(321UL, blsct.get_amount_recovery_result_amount(amountsRv.value, 0));
        Assert.Equal("fungible-token", blsct.get_amount_recovery_result_msg(amountsRv.value, 0));

        blsct.delete_amount_recovery_req_vec(reqVec);
        blsct.free_amounts_ret_val(amountsRv);
        blsct.delete_uint64_vec(uint64Vec);
        blsct.free_obj(rvNonce.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rpVal);
    }

    // =========================================================================
    // String Map Helpers
    // =========================================================================

    [Fact]
    public void StringMap_CreateAddGetDelete()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var map = blsct.create_string_map();
        Assert.NotNull(map);

        blsct.add_to_string_map(map, "key1", "value1");
        blsct.add_to_string_map(map, "key2", "value2");

        Assert.Equal(2U, blsct.get_string_map_size(map));
        Assert.Equal("key1", blsct.get_string_map_key_at(map, 0));
        Assert.Equal("value1", blsct.get_string_map_value_at(map, 0));
        Assert.Equal("key2", blsct.get_string_map_key_at(map, 1));
        Assert.Equal("value2", blsct.get_string_map_value_at(map, 1));

        blsct.delete_string_map(map);
    }

    // =========================================================================
    // Token Info
    // =========================================================================

    [Fact]
    public void TokenInfo_BuildAndGetters()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvPk = blsct.gen_random_public_key();
        var pk = blsct.cast_to_pub_key(AssertSuccess(rvPk));

        var metadata = blsct.create_string_map();
        blsct.add_to_string_map(metadata, "symbol", "TOK");
        blsct.add_to_string_map(metadata, "name", "Token Collection");

        var rvTi = blsct.build_token_info(BlsctTokenType.BlsctToken, pk, metadata, 5_000_000);
        var tiVal = AssertSuccess(rvTi);

        Assert.Equal(BlsctTokenType.BlsctToken, blsct.get_token_info_type(tiVal));
        Assert.NotNull(blsct.get_token_info_public_key(tiVal));
        Assert.Equal(5_000_000UL, blsct.get_token_info_total_supply(tiVal));

        var md = blsct.get_token_info_metadata(tiVal);
        Assert.NotNull(md);
        Assert.Equal(2U, blsct.get_string_map_size(md));

        blsct.delete_string_map(metadata);
        blsct.delete_token_info(tiVal);
        blsct.free_obj(rvPk.value);
    }

    [Fact]
    public void TokenInfo_SerializeDeserialize_RoundTrips()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvPk = blsct.gen_random_public_key();
        var pk = blsct.cast_to_pub_key(AssertSuccess(rvPk));

        var metadata = blsct.create_string_map();
        blsct.add_to_string_map(metadata, "symbol", "TOK");

        var rvTi = blsct.build_token_info(BlsctTokenType.BlsctToken, pk, metadata, 1000);
        var tiVal = AssertSuccess(rvTi);

        var hex = blsct.serialize_token_info(tiVal);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_token_info(hex);
        var ti2 = AssertSuccess(rv2);
        Assert.Equal(hex, blsct.serialize_token_info(ti2));

        blsct.delete_string_map(metadata);
        blsct.delete_token_info(tiVal);
        blsct.delete_token_info(ti2);
        blsct.free_obj(rvPk.value);
    }

    // =========================================================================
    // Collection Token Hash & Key Derivation
    // =========================================================================

    [Fact]
    public void CollectionToken_CalcHashAndDeriveKey()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var metadata = blsct.create_string_map();
        blsct.add_to_string_map(metadata, "symbol", "TOK");
        blsct.add_to_string_map(metadata, "name", "Token Collection");

        var rvHash = blsct.calc_collection_token_hash(metadata, 5_000_000);
        var hashVal = AssertSuccess(rvHash);
        var hash = blsct.cast_to_uint256(hashVal);

        var rvMasterKey = blsct.gen_scalar(31337);
        var masterKey = blsct.cast_to_scalar(AssertSuccess(rvMasterKey));

        var rvDerived = blsct.derive_collection_token_key(masterKey, hash);
        AssertSuccess(rvDerived);

        var derivedPk = blsct.derive_collection_token_public_key(masterKey, hash);
        Assert.NotNull(derivedPk);

        blsct.delete_string_map(metadata);
        blsct.free_obj(hashVal);
        blsct.free_obj(rvMasterKey.value);
        blsct.free_obj(rvDerived.value);
    }

    // =========================================================================
    // TxIn build & getters
    // =========================================================================

    [Fact]
    public void TxIn_BuildAndGetters()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvGamma = blsct.gen_scalar(456);
        var gamma = blsct.cast_to_scalar(AssertSuccess(rvGamma));
        var rvSpend = blsct.gen_random_scalar();
        var spendKey = blsct.cast_to_scalar(AssertSuccess(rvSpend));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));

        var ctxIdHex = new string('b', 64);
        var rvOp = blsct.gen_out_point(ctxIdHex);
        var outPoint = blsct.cast_to_out_point(AssertSuccess(rvOp));

        var rvTxIn = blsct.build_tx_in(123, gamma, spendKey, tokenId, outPoint, false, false);
        var txInVal = AssertSuccess(rvTxIn);
        var txIn = blsct.cast_to_tx_in(txInVal);

        Assert.Equal(123UL, blsct.get_tx_in_amount(txIn));
        Assert.NotNull(blsct.get_tx_in_gamma(txIn));
        Assert.NotNull(blsct.get_tx_in_spending_key(txIn));
        Assert.NotNull(blsct.get_tx_in_token_id(txIn));
        Assert.NotNull(blsct.get_tx_in_out_point(txIn));
        Assert.False(blsct.get_tx_in_staked_commitment(txIn));
        Assert.False(blsct.get_tx_in_rbf(txIn));

        blsct.free_obj(rvGamma.value);
        blsct.free_obj(rvSpend.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rvOp.value);
        blsct.free_obj(txInVal);
    }

    // =========================================================================
    // TxOut build & getters
    // =========================================================================

    [Fact]
    public void TxOut_BuildAndGetters()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        // Build a destination sub-address
        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);
        var txKey = blsct.from_child_key_to_tx_key(childKey);
        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        var spendPk = blsct.scalar_to_pub_key(blsct.from_tx_key_to_spending_key(txKey));
        var subAddr = blsct.derive_sub_address(viewKey, spendPk, blsct.gen_sub_addr_id(0, 0));

        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));
        var rvBlindKey = blsct.gen_random_scalar();
        var blindKey = blsct.cast_to_scalar(AssertSuccess(rvBlindKey));

        var rvTxOut = blsct.build_tx_out(subAddr, 12345, "navio", tokenId,
            TxOutputType.Normal, 0, false, blindKey);
        var txOutVal = AssertSuccess(rvTxOut);
        var txOut = blsct.cast_to_tx_out(txOutVal);

        Assert.Equal(12345UL, blsct.get_tx_out_amount(txOut));
        Assert.Equal("navio", blsct.get_tx_out_memo(txOut));
        Assert.NotNull(blsct.get_tx_out_destination(txOut));
        Assert.NotNull(blsct.get_tx_out_token_id(txOut));
        Assert.Equal(TxOutputType.Normal, blsct.get_tx_out_output_type(txOut));
        Assert.Equal(0UL, blsct.get_tx_out_min_stake(txOut));
        Assert.False(blsct.get_tx_out_subtract_fee_from_amount(txOut));
        Assert.NotNull(blsct.get_tx_out_blinding_key(txOut));

        blsct.free_obj(rvSeed.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rvBlindKey.value);
        blsct.free_obj(txOutVal);
    }

    // =========================================================================
    // Unsigned Transaction build/sign
    // =========================================================================

    [Fact]
    public void UnsignedTx_BuildAndSign()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        // Build TxIn
        var rvGamma = blsct.gen_scalar(100);
        var gamma = blsct.cast_to_scalar(AssertSuccess(rvGamma));
        var rvSpend = blsct.gen_scalar(101);
        var spendKey = blsct.cast_to_scalar(AssertSuccess(rvSpend));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));
        var ctxIdHex = new string('1', 64);
        var rvOp = blsct.gen_out_point(ctxIdHex);
        var outPoint = blsct.cast_to_out_point(AssertSuccess(rvOp));

        ulong fee = 400000;
        ulong outAmount = 10000;
        ulong inAmount = fee + outAmount;

        var rvTxIn = blsct.build_tx_in(inAmount, gamma, spendKey, tokenId, outPoint, false, false);
        var txIn = blsct.cast_to_tx_in(AssertSuccess(rvTxIn));

        // Build unsigned input
        var rvUnsIn = blsct.build_unsigned_input(txIn);
        var unsIn = AssertSuccess(rvUnsIn);

        // Build TxOut (destination)
        var rvSeed = blsct.gen_scalar(91);
        var destSeed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var destPk = blsct.scalar_to_pub_key(blsct.cast_to_scalar(AssertSuccess(blsct.gen_scalar(92))));
        var subAddr = blsct.derive_sub_address(destSeed, destPk, blsct.gen_sub_addr_id(7, 9));

        var rvBlindKey = blsct.gen_scalar(777);
        var blindKey = blsct.cast_to_scalar(AssertSuccess(rvBlindKey));
        var rvTxOut = blsct.build_tx_out(subAddr, outAmount, "navio", tokenId,
            TxOutputType.Normal, 0, false, blindKey);
        var txOut = blsct.cast_to_tx_out(AssertSuccess(rvTxOut));

        // Build unsigned output
        var rvUnsOut = blsct.build_unsigned_output(txOut);
        var unsOut = AssertSuccess(rvUnsOut);

        // Build unsigned transaction
        var unsTx = blsct.create_unsigned_transaction();
        blsct.add_unsigned_transaction_input(unsTx, unsIn);
        blsct.add_unsigned_transaction_output(unsTx, unsOut);
        blsct.set_unsigned_transaction_fee(unsTx, fee);

        Assert.Equal(fee, blsct.get_unsigned_transaction_fee(unsTx));
        Assert.Equal(1U, blsct.get_unsigned_transaction_inputs_size(unsTx));
        Assert.Equal(1U, blsct.get_unsigned_transaction_outputs_size(unsTx));

        // Serialize/deserialize unsigned tx
        var unsHex = blsct.serialize_unsigned_transaction(unsTx);
        AssertValidHex(unsHex);
        var rvUnsTx2 = blsct.deserialize_unsigned_transaction(unsHex);
        AssertSuccess(rvUnsTx2);

        // Sign
        var rvSigned = blsct.sign_unsigned_transaction(unsTx);
        AssertSuccess(rvSigned);

        // Cleanup
        blsct.delete_unsigned_input(unsIn);
        blsct.delete_unsigned_output(unsOut);
        blsct.delete_unsigned_transaction(unsTx);
        blsct.free_obj(rvGamma.value);
        blsct.free_obj(rvSpend.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rvOp.value);
        blsct.free_obj(rvTxIn.value);
        blsct.free_obj(rvSeed.value);
        blsct.free_obj(rvBlindKey.value);
        blsct.free_obj(rvTxOut.value);
        blsct.free_obj(rvSigned.value);
        blsct.free_obj(rvUnsIn.value);
        blsct.free_obj(rvUnsOut.value);
        blsct.free_obj(rvUnsTx2.value);
    }

    [Fact]
    public void UnsignedInput_SerializeDeserialize()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvGamma = blsct.gen_scalar(100);
        var gamma = blsct.cast_to_scalar(AssertSuccess(rvGamma));
        var rvSpend = blsct.gen_scalar(101);
        var spendKey = blsct.cast_to_scalar(AssertSuccess(rvSpend));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));
        var rvOp = blsct.gen_out_point(new string('c', 64));
        var outPoint = blsct.cast_to_out_point(AssertSuccess(rvOp));

        var rvTxIn = blsct.build_tx_in(250000, gamma, spendKey, tokenId, outPoint, false, false);
        var txIn = blsct.cast_to_tx_in(AssertSuccess(rvTxIn));
        var rvUns = blsct.build_unsigned_input(txIn);
        var unsIn = AssertSuccess(rvUns);

        var hex = blsct.serialize_unsigned_input(unsIn);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_unsigned_input(hex);
        var unsIn2 = AssertSuccess(rv2);
        Assert.Equal(hex, blsct.serialize_unsigned_input(unsIn2));

        blsct.delete_unsigned_input(unsIn);
        blsct.delete_unsigned_input(unsIn2);
        blsct.free_obj(rvGamma.value);
        blsct.free_obj(rvSpend.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rvOp.value);
        blsct.free_obj(rvTxIn.value);
    }

    // =========================================================================
    // Signed Transaction (CTx) & CTx accessors
    // =========================================================================

    [Fact]
    public void CTx_BuildAndAccessors()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        // Use the unsigned tx flow to get a signed tx
        var signedHex = BuildSignedTxHex(new string('1', 64), 10000);
        Assert.NotNull(signedHex);
        AssertValidHex(signedHex);

        // Deserialize and inspect
        var rvCtx = blsct.deserialize_ctx(signedHex);
        var ctxVal = AssertSuccess(rvCtx);

        var ctxId = blsct.get_ctx_id(ctxVal);
        Assert.NotNull(ctxId);
        Assert.NotEmpty(ctxId);

        var ins = blsct.get_ctx_ins(ctxVal);
        Assert.NotNull(ins);
        Assert.True(blsct.get_ctx_ins_size(ins) > 0);

        var outs = blsct.get_ctx_outs(ctxVal);
        Assert.NotNull(outs);
        Assert.True(blsct.get_ctx_outs_size(outs) > 0);

        // CTx serialize round-trip
        var hex2 = blsct.serialize_ctx(ctxVal);
        Assert.Equal(signedHex, hex2);

        blsct.delete_ctx(ctxVal);
    }

    [Fact]
    public void CTxIn_Accessors()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var signedHex = BuildSignedTxHex(new string('2', 64), 10000);
        var rvCtx = blsct.deserialize_ctx(signedHex);
        var ctxVal = AssertSuccess(rvCtx);

        var ins = blsct.get_ctx_ins(ctxVal);
        var ctxIn = blsct.get_ctx_in_at(ins, 0);

        Assert.NotNull(blsct.get_ctx_in_prev_out_hash(ctxIn));
        Assert.NotNull(blsct.get_ctx_in_script_sig(ctxIn));
        var seq = blsct.get_ctx_in_sequence(ctxIn);
        Assert.True(seq > 0);
        Assert.NotNull(blsct.get_ctx_in_script_witness(ctxIn));

        blsct.delete_ctx(ctxVal);
    }

    [Fact]
    public void CTxOut_Accessors()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var signedHex = BuildSignedTxHex(new string('3', 64), 10000);
        var rvCtx = blsct.deserialize_ctx(signedHex);
        var ctxVal = AssertSuccess(rvCtx);

        var outs = blsct.get_ctx_outs(ctxVal);
        var ctxOut = blsct.get_ctx_out_at(outs, 0);

        // These accessors should not throw
        blsct.get_ctx_out_value(ctxOut);
        Assert.NotNull(blsct.get_ctx_out_script_pub_key(ctxOut));
        Assert.NotNull(blsct.get_ctx_out_token_id(ctxOut));
        Assert.NotNull(blsct.get_ctx_out_spending_key(ctxOut));
        Assert.NotNull(blsct.get_ctx_out_ephemeral_key(ctxOut));
        Assert.NotNull(blsct.get_ctx_out_blinding_key(ctxOut));
        blsct.get_ctx_out_view_tag(ctxOut);

        var rvRp = blsct.get_ctx_out_range_proof(ctxOut);
        Assert.NotNull(rvRp);

        blsct.delete_ctx(ctxVal);
    }

    [Fact]
    public void CTxId_SerializeDeserialize()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var signedHex = BuildSignedTxHex(new string('4', 64), 10000);
        var rvCtx = blsct.deserialize_ctx(signedHex);
        var ctxVal = AssertSuccess(rvCtx);

        var ins = blsct.get_ctx_ins(ctxVal);
        var ctxIn = blsct.get_ctx_in_at(ins, 0);
        var ctxId = blsct.get_ctx_in_prev_out_hash(ctxIn);

        var hex = blsct.serialize_ctx_id(ctxId);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_ctx_id(hex);
        AssertSuccess(rv2);

        blsct.delete_ctx(ctxVal);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Transaction Aggregation
    // =========================================================================

    [Fact]
    public void TxAggregation_MergesTwoTransactions()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var hex1 = BuildSignedTxHex(new string('5', 64), 10000);
        var hex2 = BuildSignedTxHex(new string('6', 64), 20000);

        var hexVec = blsct.create_tx_hex_vec();
        blsct.add_to_tx_hex_vec(hexVec, hex1);
        blsct.add_to_tx_hex_vec(hexVec, hex2);

        var rvAgg = blsct.aggregate_transactions(hexVec);
        var aggVal = AssertSuccess(rvAgg);

        // Deserialize aggregated to check structure
        var aggHex = blsct.cast_to_const_char_ptr(aggVal);
        Assert.NotNull(aggHex);
        AssertValidHex(aggHex);

        var rvCtx = blsct.deserialize_ctx(aggHex);
        var ctxVal = AssertSuccess(rvCtx);
        var insSize = blsct.get_ctx_ins_size(blsct.get_ctx_ins(ctxVal));
        Assert.True(insSize >= 2); // 2 inputs from 2 txs

        blsct.delete_tx_hex_vec(hexVec);
        blsct.delete_ctx(ctxVal);
        blsct.free_obj(aggVal);
    }

    // =========================================================================
    // Vector Predicates
    // =========================================================================

    [Fact]
    public void VectorPredicate_CreateTokenPredicate()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvPk = blsct.gen_random_public_key();
        var pk = blsct.cast_to_pub_key(AssertSuccess(rvPk));

        var metadata = blsct.create_string_map();
        blsct.add_to_string_map(metadata, "symbol", "TOK");

        var rvTi = blsct.build_token_info(BlsctTokenType.BlsctToken, pk, metadata, 5_000_000);
        var tiVal = AssertSuccess(rvTi);

        var rvPred = blsct.build_create_token_predicate(tiVal);
        var predVal = AssertSuccess(rvPred);
        var pred = blsct.cast_to_vector_predicate(predVal);

        Assert.Equal(BlsctPredicateType.BlsctCreateTokenPredicateType,
            blsct.get_vector_predicate_type(pred, rvPred.value_size));

        // Serialize round-trip
        var hex = blsct.serialize_vector_predicate(pred, rvPred.value_size);
        AssertValidHex(hex);
        var rvPred2 = blsct.deserialize_vector_predicate(hex);
        AssertSuccess(rvPred2);

        blsct.delete_string_map(metadata);
        blsct.delete_token_info(tiVal);
        blsct.free_obj(rvPk.value);
        blsct.free_obj(predVal);
        blsct.free_obj(rvPred2.value);
    }

    [Fact]
    public void VectorPredicate_MintTokenPredicate()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvPk = blsct.gen_random_public_key();
        var pk = blsct.cast_to_pub_key(AssertSuccess(rvPk));

        var rvPred = blsct.build_mint_token_predicate(pk, 123456);
        var predVal = AssertSuccess(rvPred);
        var pred = blsct.cast_to_vector_predicate(predVal);

        Assert.Equal(BlsctPredicateType.BlsctMintTokenPredicateType,
            blsct.get_vector_predicate_type(pred, rvPred.value_size));

        Assert.NotNull(blsct.get_mint_token_predicate_public_key(pred, rvPred.value_size));
        Assert.Equal(123456UL, blsct.get_mint_token_predicate_amount(pred, rvPred.value_size));

        blsct.free_obj(rvPk.value);
        blsct.free_obj(predVal);
    }

    [Fact]
    public void VectorPredicate_MintNftPredicate()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvPk = blsct.gen_random_public_key();
        var pk = blsct.cast_to_pub_key(AssertSuccess(rvPk));

        var metadata = blsct.create_string_map();
        blsct.add_to_string_map(metadata, "name", "Artifact");
        blsct.add_to_string_map(metadata, "rarity", "legendary");

        var rvPred = blsct.build_mint_nft_predicate(pk, 42, metadata);
        var predVal = AssertSuccess(rvPred);
        var pred = blsct.cast_to_vector_predicate(predVal);

        Assert.Equal(BlsctPredicateType.BlsctMintNftPredicateType,
            blsct.get_vector_predicate_type(pred, rvPred.value_size));

        Assert.NotNull(blsct.get_mint_nft_predicate_public_key(pred, rvPred.value_size));
        Assert.Equal(42UL, blsct.get_mint_nft_predicate_nft_id(pred, rvPred.value_size));

        var md = blsct.get_mint_nft_predicate_metadata(pred, rvPred.value_size);
        Assert.NotNull(md);

        blsct.delete_string_map(metadata);
        blsct.free_obj(rvPk.value);
        blsct.free_obj(predVal);
    }

    // =========================================================================
    // Script serialization
    // =========================================================================

    [Fact]
    public void Script_SerializeDeserialize()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        // Get a script from a CTx output
        var signedHex = BuildSignedTxHex(new string('7', 64), 10000);
        var rvCtx = blsct.deserialize_ctx(signedHex);
        var ctxVal = AssertSuccess(rvCtx);
        var outs = blsct.get_ctx_outs(ctxVal);
        var ctxOut = blsct.get_ctx_out_at(outs, 0);
        var script = blsct.get_ctx_out_script_pub_key(ctxOut);

        var hex = blsct.serialize_script(script);
        AssertValidHex(hex);

        var rv2 = blsct.deserialize_script(hex);
        var script2 = blsct.cast_to_script(AssertSuccess(rv2));
        Assert.Equal(hex, blsct.serialize_script(script2));

        blsct.delete_ctx(ctxVal);
        blsct.free_obj(rv2.value);
    }

    // =========================================================================
    // Misc helpers
    // =========================================================================

    [Fact]
    public void HexToMallocedBuf_And_BufToHex()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var hex = "deadbeef";
        var buf = blsct.hex_to_malloced_buf(hex);
        Assert.NotNull(buf);

        var hexBack = blsct.buf_to_malloced_hex_c_str(buf, 4);
        Assert.Equal(hex, hexBack);
    }

    [Fact]
    public void Uint64Vec_CreateAddDelete()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var vec = blsct.create_uint64_vec();
        Assert.NotNull(vec);

        blsct.add_to_uint64_vec(vec, 100);
        blsct.add_to_uint64_vec(vec, 200);

        blsct.delete_uint64_vec(vec);
    }

    [Fact]
    public void CastHelpers_ReturnNonNull()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        // Test cast helpers via real objects
        var rv = blsct.gen_random_scalar();
        var val = AssertSuccess(rv);

        var scalar = blsct.cast_to_scalar(val);
        Assert.NotNull(scalar);

        blsct.free_obj(val);
    }

    [Fact]
    public void CastToSizeT()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        Assert.Equal(42U, blsct.cast_to_size_t(42));
        Assert.Equal(0U, blsct.cast_to_size_t(0));
    }

    // =========================================================================
    // CTx equality helpers
    // =========================================================================

    [Fact]
    public void CTx_EqualityHelpers()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var signedHex = BuildSignedTxHex(new string('8', 64), 10000);
        var rvCtx = blsct.deserialize_ctx(signedHex);
        var ctxVal = AssertSuccess(rvCtx);

        var ins = blsct.get_ctx_ins(ctxVal);
        Assert.True(blsct.are_ctx_ins_equal(ins, ins));

        var outs = blsct.get_ctx_outs(ctxVal);
        Assert.True(blsct.are_ctx_outs_equal(outs, outs));

        if (blsct.get_ctx_ins_size(ins) > 0)
        {
            var in0 = blsct.get_ctx_in_at(ins, 0);
            Assert.True(blsct.are_ctx_in_equal(in0, in0));
        }

        if (blsct.get_ctx_outs_size(outs) > 0)
        {
            var out0 = blsct.get_ctx_out_at(outs, 0);
            Assert.True(blsct.are_ctx_out_equal(out0, out0));
        }

        blsct.delete_ctx(ctxVal);
    }

    // =========================================================================
    // Deterministic golden values (matching TS crossBuildDeterminism tests)
    // =========================================================================

    [Fact]
    public void Deterministic_GoldenValues()
    {
        SkipIfNoLib();
        if (!HasNativeLib) return;

        var rvSeed = blsct.gen_scalar(12345);
        var seed = blsct.cast_to_scalar(AssertSuccess(rvSeed));
        var childKey = blsct.from_seed_to_child_key(seed);

        var txKey = blsct.from_child_key_to_tx_key(childKey);
        Assert.Equal("40bfc8642c6b2d6a486bce01020d40f820f1b6d6ec754c442d3cc88cf0ba4d77",
            blsct.serialize_scalar(txKey));

        var viewKey = blsct.from_tx_key_to_view_key(txKey);
        Assert.Equal("56a81847101d56c621fd9ee7aba124a73b29c7c22543beec406c4464611d4031",
            blsct.serialize_scalar(viewKey));

        var spendingKey = blsct.from_tx_key_to_spending_key(txKey);
        Assert.Equal("65d2466b27fad55e7794391f136fa35ec82407f1ddb61b34f43ef35945b91fb3",
            blsct.serialize_scalar(spendingKey));

        var spendPk = blsct.scalar_to_pub_key(spendingKey);
        var spendPkHex = blsct.serialize_public_key(blsct.get_public_key_point(spendPk));
        Assert.Equal("85799b2f7251f894167865f175e20cb8c2feb227e5077ce11c852175057d93dab33709d432539c837fb2f2be6866ed39",
            spendPkHex);

        blsct.free_obj(rvSeed.value);
    }

    // =========================================================================
    // Helper: build a signed transaction hex
    // =========================================================================

    private string BuildSignedTxHex(string ctxIdHex, ulong outAmount)
    {
        blsct.init();

        var rvGamma = blsct.gen_scalar(100);
        var gamma = blsct.cast_to_scalar(AssertSuccess(rvGamma));
        var rvSpend = blsct.gen_scalar(101);
        var spendKey = blsct.cast_to_scalar(AssertSuccess(rvSpend));
        var rvTid = blsct.gen_default_token_id();
        var tokenId = blsct.cast_to_token_id(AssertSuccess(rvTid));
        var rvOp = blsct.gen_out_point(ctxIdHex);
        var outPoint = blsct.cast_to_out_point(AssertSuccess(rvOp));

        ulong fee = 400000;
        ulong inAmount = fee + outAmount;

        var rvTxIn = blsct.build_tx_in(inAmount, gamma, spendKey, tokenId, outPoint, false, false);
        var txIn = blsct.cast_to_tx_in(AssertSuccess(rvTxIn));
        var rvUnsIn = blsct.build_unsigned_input(txIn);
        var unsIn = AssertSuccess(rvUnsIn);

        // Destination
        var rvDestKey = blsct.gen_scalar(91);
        var destKey = blsct.cast_to_scalar(AssertSuccess(rvDestKey));
        var destPk = blsct.scalar_to_pub_key(blsct.cast_to_scalar(AssertSuccess(blsct.gen_scalar(92))));
        var subAddr = blsct.derive_sub_address(destKey, destPk, blsct.gen_sub_addr_id(7, 9));

        var rvBlindKey = blsct.gen_scalar(777);
        var blindKey = blsct.cast_to_scalar(AssertSuccess(rvBlindKey));
        var rvTxOut = blsct.build_tx_out(subAddr, outAmount, "navio", tokenId,
            TxOutputType.Normal, 0, false, blindKey);
        var txOut = blsct.cast_to_tx_out(AssertSuccess(rvTxOut));
        var rvUnsOut = blsct.build_unsigned_output(txOut);
        var unsOut = AssertSuccess(rvUnsOut);

        var unsTx = blsct.create_unsigned_transaction();
        blsct.add_unsigned_transaction_input(unsTx, unsIn);
        blsct.add_unsigned_transaction_output(unsTx, unsOut);
        blsct.set_unsigned_transaction_fee(unsTx, fee);

        var rvSigned = blsct.sign_unsigned_transaction(unsTx);
        var signedVal = AssertSuccess(rvSigned);
        var signedHex = blsct.cast_to_const_char_ptr(signedVal);

        // Cleanup
        blsct.delete_unsigned_input(unsIn);
        blsct.delete_unsigned_output(unsOut);
        blsct.delete_unsigned_transaction(unsTx);
        blsct.free_obj(rvGamma.value);
        blsct.free_obj(rvSpend.value);
        blsct.free_obj(rvTid.value);
        blsct.free_obj(rvOp.value);
        blsct.free_obj(rvTxIn.value);
        blsct.free_obj(rvDestKey.value);
        blsct.free_obj(rvBlindKey.value);
        blsct.free_obj(rvTxOut.value);
        blsct.free_obj(signedVal);

        return signedHex;
    }
}
