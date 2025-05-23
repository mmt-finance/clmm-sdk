import { PoolModule } from '../src/modules/poolModule';
import { MmtSDK, PositionModule } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import ALL_POOL_DATA from './__test_data__/all-pools.json';
import ALL_TOKEN_DATA from './__test_data__/all-tokens.json';

import { fetchAllPoolsApi, fetchAllTokenApi } from '../src/utils/poolUtils';

describe('PositionModule.getUserPositionsUsdValue', () => {
  let sdk: MmtSDK;
  let positionModule: PositionModule;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({ network: 'mainnet' });
    positionModule = sdk.Position;
    poolModule = sdk.Pool;
  });

  it('should return correct USD value', async () => {
    const address = '0x87452754102fbe7b76d15821b4ea3af2e51ab577adeb9189cd274e792076f75e';

    const pools = await poolModule.getAllPools();
    const tokens = await poolModule.getAllTokens();

    const positions = await positionModule.getUserPositionsUsdValue(address, pools, tokens);
    const positionUsdValue = positions.map((position) => position.amount);

    const allPositions = await positionModule.getAllUserPositions(address);
    const positionUsdValueReturnByAllPositions = allPositions.map((position) => position.amount);

    expect(positionUsdValue).toEqual(positionUsdValueReturnByAllPositions);
  });
});
