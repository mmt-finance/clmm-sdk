import { MmtSDK } from '../src';
import { ExtendedPool, RewardersAPYSchema, TickLiquidity, TokenSchema } from '../src/types';

export async function main() {
  // Initialize SDK
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });

  // Read all available pools
  const pools: ExtendedPool[] = await sdk.Pool.getAllPools();

  // Read info for a certain pool
  const poolId = pools[0].poolId;
  const poolInfo: ExtendedPool = await sdk.Pool.getPool(poolId);

  // Retrieve tick info for a certain pool
  const tickInfo: TickLiquidity[] = await sdk.Pool.fetchAllTickLiquidities(poolId);

  // Fetch incentive rewards for a certain pool
  const rewarderInfo: RewardersAPYSchema = await sdk.Pool.getRewardersApy(poolId);

  // Retrieve all supported tokens
  const tokens: TokenSchema[] = await sdk.Pool.getAllTokens();
}

main();
