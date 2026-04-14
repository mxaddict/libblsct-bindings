using System;
using NavioBlsct;
using Xunit;

namespace NavioBlsct.Tests
{
    public class BlsctIntegrationTests
    {
        static readonly byte[] TestViewKey = new byte[32];
        static readonly byte[] TestSpendKey = new byte[48];

        private static bool HasLibblsct => !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("LIBBLSCT_SO_PATH"));

        [Fact]
        public void GenSubAddrIdReturnsNonZeroHandle()
        {
            if (!HasLibblsct) return;

            var handle = Blsct.GenSubAddrId(0, 0);
            Assert.NotEqual(IntPtr.Zero, handle);

            Blsct.FreeObj(handle);
        }

        [Fact]
        public void DeriveSubAddressWithValidKeysReturnsNonZeroHandle()
        {
            if (!HasLibblsct) return;

            var subAddrId = Blsct.GenSubAddrId(0, 0);
            try
            {
                var handle = Blsct.DeriveSubAddress(TestViewKey, TestSpendKey, subAddrId);
                Assert.NotEqual(IntPtr.Zero, handle);
                Blsct.FreeObj(handle);
            }
            finally
            {
                Blsct.FreeObj(subAddrId);
            }
        }

        [Fact]
        public void EncodeAddressWithTnvHrpStartsWithPrefix()
        {
            if (!HasLibblsct) return;

            var subAddrId = Blsct.GenSubAddrId(0, 0);
            try
            {
                var subAddr = Blsct.DeriveSubAddress(TestViewKey, TestSpendKey, subAddrId);
                try
                {
                    var address = Blsct.EncodeAddress(subAddr, AddressEncoding.Bech32M);
                    Assert.StartsWith("tnv1", address);
                }
                finally
                {
                    Blsct.FreeObj(subAddr);
                }
            }
            finally
            {
                Blsct.FreeObj(subAddrId);
            }
        }

        [Fact]
        public void EncodeDecodeRoundTrip()
        {
            if (!HasLibblsct) return;

            var subAddrId = Blsct.GenSubAddrId(0, 0);
            try
            {
                var subAddr = Blsct.DeriveSubAddress(TestViewKey, TestSpendKey, subAddrId);
                try
                {
                    var encoded = Blsct.EncodeAddress(subAddr, AddressEncoding.Bech32M);
                    Assert.NotEmpty(encoded);

                    var decoded = Blsct.DecodeAddress(encoded);
                    Assert.NotEqual(IntPtr.Zero, decoded);

                    Blsct.FreeObj(decoded);
                }
                finally
                {
                    Blsct.FreeObj(subAddr);
                }
            }
            finally
            {
                Blsct.FreeObj(subAddrId);
            }
        }

        [Fact]
        public void EncodeAddressWithBech32MIsNonEmpty()
        {
            if (!HasLibblsct) return;

            var subAddrId = Blsct.GenSubAddrId(0, 0);
            try
            {
                var subAddr = Blsct.DeriveSubAddress(TestViewKey, TestSpendKey, subAddrId);
                try
                {
                    var address = Blsct.EncodeAddress(subAddr, AddressEncoding.Bech32M);
                    Assert.NotNull(address);
                    Assert.NotEmpty(address);
                }
                finally
                {
                    Blsct.FreeObj(subAddr);
                }
            }
            finally
            {
                Blsct.FreeObj(subAddrId);
            }
        }

        // NOTE: encode_address(BlsctSubAddr*, AddressEncoding) does not take an HRP parameter.
        // The HRP is fixed by the native library — HRP switching is not exposed via this API.
        // A separate mainnet HRP test is omitted until the C API supports it.

        [Fact]
        public void DecodeAddressThrowsOnInvalidInput()
        {
            if (!HasLibblsct) return;

            Assert.Throws<InvalidOperationException>(() =>
            {
                Blsct.DecodeAddress("invalid-address");
            });
        }

        [Fact(Skip = "fixture not yet generated")]
        public void FullPipeline_MatchesFixture()
        {
            // Test vectors are loaded from blsct_vectors.json (not yet generated).
            // Once libblsct.so builds and the fixture generator runs, this test will
            // verify the full encode/decode pipeline against the expected addresses.
            // See BTCPAY.md "Test Vectors" section for fixture generation steps.
        }
    }
}
