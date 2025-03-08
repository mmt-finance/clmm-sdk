import { MmtSDK } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { executeTxExample, getPoolAndLiquidity } from './example-utils';

export async function main() {
  // Initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
  const poolId = '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7';
  const { pool, position, positionId } = await getPoolAndLiquidity(poolId, sdk, senderAddress);
  const liquidity = await sdk.Position.getLiquidity(position.objectId);

  const tx = new Transaction();
  const poolParams = {
    objectId: poolId,
    tokenXType: pool.tokenXType,
    tokenYType: pool.tokenYType,
    tickSpacing: pool.tickSpacing,
  };

  sdk.Pool.removeLiquidity(
    tx,
    poolParams,
    position.objectId,
    BigInt(liquidity),
    BigInt(0), // Min X amount based on slippage settings
    BigInt(0), // Min Y amount based on slippage settings
    senderAddress,
  );

  // Claim rewards and fees
  if (position.rewarders && position.rewarders.length !== 0) {
    sdk.Pool.collectAllRewards(tx, poolParams, pool.rewarders, positionId, senderAddress);
  }
  sdk.Pool.collectFee(tx, poolParams, positionId, senderAddress);

  // Close position
  sdk.Position.closePosition(tx, positionId);

  // Execute transaction
  const resp = await executeTxExample({
    tx,
    sdk,
    execution: { dryRun: true, address: senderAddress },
  });
  console.log(resp);
}

main()
  .then(() => console.log('Close position successfully'))
  .catch((error) => console.error('Close position failed:', error));
