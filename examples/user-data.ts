import { MmtSDK } from '../src';
import { ExtendedPool, RewardersAPYSchema, TickLiquidity, TokenSchema } from '../src/types';
import { fetchUserObjectsByPkg } from '../src/utils/poolUtils';

export async function main() {
  // Initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';

  // Read all user positions include fees and incentives
  const userPositions = await sdk.Position.getAllUserPositions(senderAddress);

  // Read all user rewards for all position(incentives and fees)
  const pools: ExtendedPool[] = await sdk.Pool.getAllPools();
  const objects = await fetchUserObjectsByPkg(
    sdk.rpcClient,
    sdk.contractConst.publishedAt,
    senderAddress,
  );
  const positions = objects.filter(
    (obj: any) => obj.type === `${sdk.contractConst.publishedAt}::position::Position`,
  );
  const rewardsAndFees = await sdk.Position.fetchRewards(
    positions,
    pools,
    senderAddress,
    sdk.rpcClient,
  );

  // read user rewards for a position (incentives and fees)
  const poolId = userPositions[0].poolId;
  const positionId = userPositions[0].objectId;
  const pool = await sdk.Pool.getPool(poolId);
  const allRewardsAndFees = await sdk.Position.fetchAllRewards(positionId, senderAddress, pool);

  // read info from a position
  const liquidity = await sdk.Position.getLiquidity(positionId);
  const lowerTick = await sdk.Position.getTickLowerIndex(positionId);
  const upperTick = await sdk.Position.getTickUpperIndex(positionId);
}

main();
