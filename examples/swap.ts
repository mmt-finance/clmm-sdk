import { MmtSDK, TickMath } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { CoinTransferIntention, mergeCoinForTransferTxb } from '../tests/transaction';
import Decimal from 'decimal.js';
import { Ed25519Keypair } from '@mysten/sui/dist/cjs/keypairs/ed25519';

export async function main() {
  // Initialize SDK
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });

  // Create a new transaction instance
  const tx = new Transaction();

  // Define the liquidity pool ID (this pool will be used for the swap)
  const poolId = '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7';
  // Fetch pool details using the SDK
  const pool = await sdk.Pool.getPool(poolId);
  if (!pool) {
    throw new Error('Pool not found');
  }
  // Get token X's coin type from the pool
  const coinType = pool.tokenX.coinType;
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
  const swapAmount = '10'; // Number of token X to be swapped
  // Define the coin merge intention (sending token X)
  const intention: CoinTransferIntention = {
    coinType: coinType, // The type of coin being transferred
    amount: swapAmount,
    recipient: senderAddress, // The address that will receive the merged tokens
  };

  // Merge coin for swap
  const coin = await mergeCoinForTransferTxb(tx, sdk.rpcClient, intention, senderAddress);

  // Fetch the current price of the pool in X64 format and convert it to a price
  const currentPrice = TickMath.sqrtPriceX64ToPrice(
    pool.currentSqrtPrice,
    pool.tokenX.decimals,
    pool.tokenY.decimals,
  );

  // Calculate the limit price (80% of the current price)
  const limitSqrtPrice = TickMath.priceToSqrtPriceX64(
    currentPrice.mul(Decimal(0.8)),
    pool.tokenX.decimals,
    pool.tokenY.decimals,
  );

  // Execute swap in tx
  sdk.Pool.swap(
    tx,
    {
      objectId: poolId, // Pool ID for the swap
      tokenXType: pool.tokenX.coinType, // Token X type
      tokenYType: pool.tokenY.coinType, // Token Y type
      tickSpacing: pool.tickSpacing, // Tick spacing of the pool
    },
    BigInt(swapAmount), // Convert swap amount to BigInt
    coin, // Prepared coin in previous tx
    true, // Boolean indicating swap direction (true = X to Y)
    senderAddress,
    limitSqrtPrice, // The maximum/minimum price to execute the swap
  );

  // Execute the transaction
  const mnemonic = ''; // Empty mnemonic (should be replaced with a valid one)
  const signer = Ed25519Keypair.deriveKeypair(mnemonic); // Generate keypair from mnemonic
  const res = await sdk.rpcClient.signAndExecuteTransaction({
    signer,
    transaction: tx,
  });
  const fin = await sdk.rpcClient.waitForTransaction({ digest: res.digest });
}

main();
