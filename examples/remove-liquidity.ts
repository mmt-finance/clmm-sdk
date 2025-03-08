import { MmtSDK } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { DryRunTransactionBlockResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export async function main() {
  // Initialize the SDK
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });

  const tx = new Transaction(); // Create a new transaction instance
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
  const poolId = '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7'; // Define the liquidity pool ID where liquidity will be removed
  const pool = await sdk.Pool.getPool(poolId); // Fetch pool details using the SDK
  if (!pool) {
    throw new Error('Pool not found');
  }
  //  Retrieve all positions for the user
  const userPositions = await sdk.Position.getAllUserPositions(senderAddress);
  if (!userPositions || userPositions.length === 0) {
    throw new Error('user has no position ');
  }

  // Get the liquidity of the first position owned by the user
  const liquidity = await sdk.Position.getLiquidity(userPositions[0].objectId);

  sdk.Pool.removeLiquidity(
    tx,
    {
      objectId: poolId,
      tokenXType: pool.tokenXType,
      tokenYType: pool.tokenYType,
      tickSpacing: pool.tickSpacing,
    },
    userPositions[0].objectId, // The position ID of the user's liquidity
    BigInt(liquidity), // The amount of liquidity to remove (converted to BigInt)
    BigInt(0), // Min X amount based on slippage settings
    BigInt(0), // Min Y amount based on slippage settings
    senderAddress,
  );
  // Execute transaction
  const mnemonic = ''; // Define the user's mnemonic (should be replaced with an actual mnemonic)
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic); // Generate the keypair from the mnemonic
  const result = await sdk.rpcClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  const responce = await sdk.rpcClient.waitForTransaction({ digest: result.digest });
}
main();
