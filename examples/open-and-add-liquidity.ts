import { MmtSDK, TickMath } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { buildCoinTransferTxb, CoinTransferIntention } from '../tests/transaction';
import { estimateLiquidityForCoinA, getCoinAmountFromLiquidity } from './utils';
import { ExtendedPool } from '../src/types';
import BN from 'bn.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export async function main() {
  // Initialize SDK
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });

  const tx = new Transaction(); // Create a new transaction instance
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
  const poolId = '0xf0d3fa213889a7c2bc79505c030b6a105d549e6608aeab201811af333f9b18a4'; // Define the liquidity pool ID (used for adding liquidity)
  const pool = await sdk.Pool.getPool(poolId); // Fetch pool details using the SDK
  if (!pool) {
    throw new Error('Pool not found');
  }

  const isInputX = true; // Define whether the input token is token X or Y (true means token X)
  // Get decimal precision for tokens in the pool
  const tokenXDecimals = pool.tokenX.decimals;
  const tokenYDecimals = pool.tokenY.decimals;
  const coinXAmount = 10; // Define the amount of token X to add as liquidity
  // Get the current price of the pool in X64 format and convert it to a price
  const currentPrice = TickMath.sqrtPriceX64ToPrice(
    pool.currentSqrtPrice,
    tokenXDecimals,
    tokenYDecimals,
  );

  // Calculate the upper price limit for adding liquidity (5% above current price)
  const upperSqrtPrice = TickMath.priceToSqrtPriceX64(
    currentPrice.mul(1.05),
    tokenXDecimals,
    tokenYDecimals,
  );

  // Calculate the lower price limit for adding liquidity (5% below current price)
  const lowerSqrtPrice = TickMath.priceToSqrtPriceX64(
    currentPrice.mul(0.95),
    tokenXDecimals,
    tokenYDecimals,
  );

  // Convert `coinXAmount` to the appropriate format based on decimals
  const amountN = Math.floor(
    Number(coinXAmount) * 10 ** (isInputX ? tokenXDecimals : tokenYDecimals),
  );

  // Estimate liquidity using the given price range and amount
  const liquidity = estimateLiquidityForCoinA(upperSqrtPrice, lowerSqrtPrice, new BN(amountN));

  // Calculate the required coin amounts based on estimated liquidity
  const coinAmounts = getCoinAmountFromLiquidity(
    liquidity,
    new BN(pool.currentSqrtPrice),
    lowerSqrtPrice,
    upperSqrtPrice,
    false,
  );

  const coinYAmount = coinAmounts.coinY; // Extract the required amount of token Y

  // Fetch the required token for the transaction
  const { coinX, coinY } = await getCoins(
    tx,
    pool,
    coinAmounts.coinX,
    coinYAmount,
    senderAddress,
    sdk,
  );
  // Open a new position in the liquidity pool
  const position = sdk.Position.openPosition(
    tx,
    {
      objectId: poolId, // Pool ID where liquidity is added
      tokenXType: pool.tokenXType, // Token X type
      tokenYType: pool.tokenYType, // Token Y type
      tickSpacing: pool.tickSpacing, // Pool tick spacing
    },
    lowerSqrtPrice.toString(), // Lower price bound
    upperSqrtPrice.toString(), // Upper price bound
  );

  // Add liquidity to the pool using the opened position
  sdk.Pool.addLiquidity(
    tx,
    {
      objectId: poolId, // Pool ID where liquidity is added
      tokenXType: pool.tokenXType, // Token X type
      tokenYType: pool.tokenYType, // Token Y type
      tickSpacing: pool.tickSpacing, // Pool tick spacing
    },
    position, // Position from previous tx
    coinX,
    coinY,
    BigInt(0), // Min a added
    BigInt(0), // Min b added
    senderAddress,
  );

  // Transfer position back to sender
  tx.transferObjects([position], senderAddress);

  const mnemonic = ''; // Generate a keypair using the user's mnemonic (should be replaced with a valid mnemonic)
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  // Sign and execute the transaction
  const result = await sdk.rpcClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  const responce = await sdk.rpcClient.waitForTransaction({ digest: result.digest });
}

export async function getCoins(
  tx: Transaction,
  pool: ExtendedPool,
  coinXAmount: string,
  coinYAmount: string,
  senderAddress: string,
  sdk: MmtSDK,
) {
  // Define an intention to transfer token X
  const intentionCoinX: CoinTransferIntention = {
    coinType: pool.tokenXType,
    amount: coinXAmount,
    recipient: senderAddress,
  };
  // Build Coin Transfer Tx
  const coinX = await buildCoinTransferTxb(tx, sdk.rpcClient, intentionCoinX, senderAddress);

  // Define an intention to transfer token Y
  const intentionCoinY: CoinTransferIntention = {
    coinType: pool.tokenYType,
    amount: coinYAmount,
    recipient: senderAddress,
  };
  // Build Coin Transfer Tx
  const coinY = await buildCoinTransferTxb(tx, sdk.rpcClient, intentionCoinY, senderAddress);

  return { coinX, coinY };
}

main();
