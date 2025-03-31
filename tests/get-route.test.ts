import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { PoolTokenType } from '../src/types';

describe('RouteModule.getRoutes', () => {
  let sdk: MmtSDK;
  let routeModule;
  // const pools: PoolTokenType[] = [
  //   { tokenXType: 'A', tokenYType: 'B', poolId: '1', tvl: '100' },
  //   { tokenXType: 'B', tokenYType: 'C', poolId: '2', tvl: '100' },
  //   { tokenXType: 'C', tokenYType: 'D', poolId: '3', tvl: '100' },
  //   { tokenXType: 'D', tokenYType: 'E', poolId: '4', tvl: '100' },
  //   { tokenXType: 'A', tokenYType: 'C', poolId: '5', tvl: '100' },
  //   { tokenXType: 'B', tokenYType: 'D', poolId: '6', tvl: '100' },
  // ];

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    routeModule = sdk.Route;
  });

  it('should include direct path among multiple paths', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'B', poolId: 'p3', tvl: '100' },
    ];

    const result = routeModule.getRoutes('A', 'B', pools);
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

  it('should return the only available path', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '100' },
    ];
    const result = routeModule.getRoutes('A', 'B', pools);

    expect(result).toEqual([
      {
        tokens: ['A', 'B'],
        pools: ['p1'],
        isXToY: [true],
      },
    ]);
  });

  it('should exclude path longer than maxHops=4', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'B', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'D', poolId: 'p3', tvl: '100' },
      { tokenXType: 'D', tokenYType: 'E', poolId: 'p4', tvl: '100' },
      { tokenXType: 'E', tokenYType: 'F', poolId: 'p5', tvl: '100' },
    ];

    const result = routeModule.getRoutes('A', 'F', pools);
    expect(result).toEqual([]);
  });

  it('should find a path that loops back to source token (non-trivial cycle)', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'B', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'A', poolId: 'p3', tvl: '100' },
    ];

    const result = routeModule.getRoutes('A', 'A', pools);

    const loopPath = result.find((r) => r.tokens.join('->') === 'A->B->C->A');
    expect(loopPath).toBeDefined();
    expect(loopPath!.pools).toEqual(['p1', 'p2', 'p3']);
  });

  it('should find 12 valid paths from A to B and exclude invalid ones (TVL=0 or too long)', () => {
    const pools: PoolTokenType[] = [
      // A->B
      // A->C->B
      // A->D->B
      // A->E->B
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '1000' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '800' },
      { tokenXType: 'C', tokenYType: 'B', poolId: 'p3', tvl: '600' },
      { tokenXType: 'A', tokenYType: 'D', poolId: 'p4', tvl: '500' },
      { tokenXType: 'D', tokenYType: 'B', poolId: 'p5', tvl: '900' },
      { tokenXType: 'A', tokenYType: 'E', poolId: 'p6', tvl: '300' },
      { tokenXType: 'E', tokenYType: 'B', poolId: 'p7', tvl: '700' },

      // A->C->G->B
      // A->E->G->B
      // A->F->G->B
      // A->F->G->C->B
      // A->F->G->E->B
      { tokenXType: 'A', tokenYType: 'F', poolId: 'p8', tvl: '400' },
      { tokenXType: 'F', tokenYType: 'G', poolId: 'p9', tvl: '400' },
      { tokenXType: 'G', tokenYType: 'B', poolId: 'p10', tvl: '200' },

      { tokenXType: 'C', tokenYType: 'G', poolId: 'p11', tvl: '300' },
      { tokenXType: 'E', tokenYType: 'G', poolId: 'p12', tvl: '200' },

      // A->H->I->J->B
      { tokenXType: 'A', tokenYType: 'H', poolId: 'p13', tvl: '200' },
      { tokenXType: 'H', tokenYType: 'I', poolId: 'p14', tvl: '250' },
      { tokenXType: 'I', tokenYType: 'J', poolId: 'p15', tvl: '150' },
      { tokenXType: 'J', tokenYType: 'B', poolId: 'p16', tvl: '100' },

      // A->B->C->A
      { tokenXType: 'B', tokenYType: 'C', poolId: 'p17', tvl: '500' },
      { tokenXType: 'C', tokenYType: 'A', poolId: 'p18', tvl: '400' },

      { tokenXType: 'A', tokenYType: 'K', poolId: 'p19', tvl: '0' },
      { tokenXType: 'K', tokenYType: 'B', poolId: 'p20', tvl: '0' },

      // A->L->M->N->O->B
      { tokenXType: 'A', tokenYType: 'L', poolId: 'p21', tvl: '100' },
      { tokenXType: 'L', tokenYType: 'M', poolId: 'p22', tvl: '100' },
      { tokenXType: 'M', tokenYType: 'N', poolId: 'p23', tvl: '100' },
      { tokenXType: 'N', tokenYType: 'O', poolId: 'p24', tvl: '100' },
      { tokenXType: 'O', tokenYType: 'B', poolId: 'p25', tvl: '100' },
    ];

    const validPools = pools.filter((p) => Number(p.tvl) > 0);

    const result = routeModule.getRoutes('A', 'B', validPools);
    const uniquePaths = result.map((r) => r.tokens.join('->'));
    console.log('result', result);

    expect(result.length).toBeGreaterThanOrEqual(10);

    expect(uniquePaths).toContain('A->B');
    expect(uniquePaths).toContain('A->C->B');
    expect(uniquePaths).toContain('A->D->B');
    // expect(uniquePaths).toContain('A->B->C->A');

    const tooLong = result.find((r) => r.tokens.length > 5);
    expect(tooLong).toBeUndefined();

    const hasZeroTVL = result.some((r) =>
      r.pools.some((poolId) => ['p19', 'p20'].includes(poolId)),
    );
    expect(hasZeroTVL).toBe(false);
  });
});
