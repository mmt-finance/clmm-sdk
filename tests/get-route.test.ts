import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { PathResult, PoolTokenType } from '../src/types';
import { DRY_RUN_PATH_LEN } from '../src/utils/constants';

describe('RouteModule.getRoutes', () => {
  let sdk: MmtSDK;
  let routeModule;
  const pools: PoolTokenType[] = [
    { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '1000.25' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '812.48' },
    { tokenXType: 'C', tokenYType: 'A', poolId: 'p26', tvl: '799.99' },
    { tokenXType: 'B', tokenYType: 'C', poolId: 'p3', tvl: '605.31' },
    { tokenXType: 'C', tokenYType: 'B', poolId: 'p27', tvl: '602.89' },
    { tokenXType: 'A', tokenYType: 'D', poolId: 'p4', tvl: '534.13' },
    { tokenXType: 'B', tokenYType: 'D', poolId: 'p5', tvl: '902.67' },
    { tokenXType: 'A', tokenYType: 'E', poolId: 'p6', tvl: '312.75' },
    { tokenXType: 'B', tokenYType: 'E', poolId: 'p7', tvl: '710.42' },

    { tokenXType: 'A', tokenYType: 'F', poolId: 'p8', tvl: '403.88' },
    { tokenXType: 'F', tokenYType: 'G', poolId: 'p9', tvl: '389.66' },
    { tokenXType: 'B', tokenYType: 'G', poolId: 'p10', tvl: '218.14' },

    { tokenXType: 'C', tokenYType: 'G', poolId: 'p11', tvl: '311.44' },
    { tokenXType: 'E', tokenYType: 'G', poolId: 'p12', tvl: '202.33' },

    { tokenXType: 'A', tokenYType: 'H', poolId: 'p13', tvl: '213.67' },
    { tokenXType: 'H', tokenYType: 'I', poolId: 'p14', tvl: '258.22' },
    { tokenXType: 'I', tokenYType: 'J', poolId: 'p15', tvl: '152.78' },
    { tokenXType: 'B', tokenYType: 'J', poolId: 'p16', tvl: '109.91' },

    { tokenXType: 'B', tokenYType: 'C', poolId: 'p17', tvl: '513.19' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p18', tvl: '405.67' },
    { tokenXType: 'B', tokenYType: 'C', poolId: 'p28', tvl: '601.23' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p29', tvl: '418.88' },

    { tokenXType: 'A', tokenYType: 'K', poolId: 'p19', tvl: '0' },
    { tokenXType: 'B', tokenYType: 'K', poolId: 'p20', tvl: '0' },

    { tokenXType: 'A', tokenYType: 'L', poolId: 'p21', tvl: '102.99' },
    { tokenXType: 'L', tokenYType: 'M', poolId: 'p22', tvl: '100.51' },
    { tokenXType: 'M', tokenYType: 'N', poolId: 'p23', tvl: '98.17' },
    { tokenXType: 'N', tokenYType: 'O', poolId: 'p24', tvl: '105.33' },
    { tokenXType: 'B', tokenYType: 'O', poolId: 'p25', tvl: '97.45' },
  ];

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    routeModule = sdk.Route;
  });

  it('should include direct path among multiple paths', async () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'B', poolId: 'p3', tvl: '100' },
    ];

    const result = await (routeModule as any).getRoutes('A', 'B', pools);
    const tokensList = result.map((r) => r.tokens.join('->'));
    expect(tokensList).toContain('A->B');
    expect(tokensList).toContain('A->C->B');
    const direct = result.find((p) => p.tokens.join('->') === 'A->B' && p.pools[0] === 'p1');
    const hop = result.find(
      (p) => p.tokens.join('->') === 'A->C->B' && p.pools[0] === 'p2' && p.pools[1] === 'p3',
    );
    expect(direct).toBeDefined();
    expect(hop).toBeDefined();
    expect(result.length).toEqual(2);
  });

  it('should return the only available path', async () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '100' },
    ];
    const result: PathResult[] = await (routeModule as any).getRoutes('A', 'B', pools);

    expect(result[0]).toEqual({
      tokens: ['A', 'B'],
      pools: ['p1'],
      isXToY: [true],
    });
  });

  it('should find 12 valid paths from A to B and exclude invalid ones (TVL=0 or too long)', async () => {
    const validPools = pools.filter((p) => Number(p.tvl) > 0);
    const result: PathResult[] = await (routeModule as any).getRoutes('A', 'B', validPools);
    const uniquePaths = result.map((r) => r.tokens.join('->'));

    expect(result.length).toEqual(DRY_RUN_PATH_LEN);

    expect(uniquePaths).toContain('A->B');
    expect(uniquePaths).toContain('A->E->B');
    expect(uniquePaths).toContain('A->D->B');
    expect(uniquePaths).toContain('A->C->B');

    const hasZeroTVL = result.some((r) =>
      r.pools.some((poolId) => ['p19', 'p20'].includes(poolId)),
    );
    expect(hasZeroTVL).toBe(false);
  });
});
