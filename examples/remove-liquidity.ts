import { MmtSDK } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { executeTxExample, getPoolAndLiquidity } from './example-utils';

export async function main() {
  // Initialize the SDK
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });

  const tx = new Transaction(); // Create a new transaction instance
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
  // Define the liquidity pool ID where liquidity will be removed
  const poolId = '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7';
  const { pool, position, positionId } = await getPoolAndLiquidity(poolId, sdk, senderAddress);

  // Get the liquidity of the first position owned by the user
  const liquidity = await sdk.Position.getLiquidity(positionId);

  sdk.Pool.removeLiquidity(
    tx,
    {
      objectId: poolId,
      tokenXType: pool.tokenXType,
      tokenYType: pool.tokenYType,
      tickSpacing: pool.tickSpacing,
    },
    positionId, // The position ID of the user's liquidity
    BigInt(liquidity) / BigInt(2), // The amount of liquidity to remove (converted to BigInt)
    BigInt(0), // Min X amount based on slippage settings
    BigInt(0), // Min Y amount based on slippage settings
    senderAddress,
  );
  // Execute transaction
  const resp = await executeTxExample({
    tx,
    sdk,
    execution: { dryRun: true, address: senderAddress },
  });
  console.log(resp);
}
main()
  .then(() => console.log('Remove liquidity successfully'))
  .catch((error) => console.error('Remove liquidity failed:', error));
