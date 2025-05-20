import {
  ExtendedPoolWithApr,
  PathResult,
  PoolTokenType,
  PreSwapParam,
  TokenSchema,
} from '../types';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { Graph, GraphVertex, GraphEdge } from '@syntsugar/cc-graph';
import { DRY_RUN_PATH_LEN, U64_MAX } from '../utils/constants';

export class RouteModule implements BaseModule {
  protected _sdk: MmtSDK;

  constructor(sdk: MmtSDK) {
    this._sdk = sdk;
  }

  get sdk() {
    return this._sdk;
  }

  public async fetchRoute(
    sourceToken: string,
    targetToken: string,
    amount: bigint,
    extendedPools?: ExtendedPoolWithApr[],
    tokens?: TokenSchema[],
  ) {
    if (amount <= 0n) {
      return null;
    }

    if (!extendedPools?.length) {
      extendedPools = await this._sdk.Pool.getAllPools();
    }

    const sourceTokenSchema = tokens?.length
      ? tokens.find((token) => token.coinType === sourceToken)
      : await this._sdk.Pool.getToken(sourceToken);

    if (!extendedPools?.length || !sourceTokenSchema) {
      throw new Error('No pools or source token found');
    }

    const pools: PoolTokenType[] = extendedPools
      .filter((pool) => Number(pool.tvl) > 0)
      .map((pool) => ({
        poolId: pool.poolId,
        tokenXType: pool.tokenXType,
        tokenYType: pool.tokenYType,
        tvl: pool.tvl,
      }));

    const pathResults = this.getRoutes(sourceToken, targetToken, pools);
    if (!pathResults) {
      console.error('No paths found:', sourceToken, targetToken);
      return null;
    }

    const best = await this.devRunSwapAndChooseBestRoute(pathResults, pools, amount);
    if (!best) {
      console.info(
        'No valid swap paths found:',
        'sourceToken:',
        sourceToken,
        'targetToken:',
        targetToken,
        'amount:',
        amount,
      );
      return null;
    }
    return best;
  }

  private getRoutes(sourceToken: string, targetToken: string, pools: PoolTokenType[]) {
    const graph = new Graph(false);
    const vertexMap = new Map<string, GraphVertex>();
    const tokenRepeatTracker = new Map<string, number>();
    let edgeToPool = new Map<string, PoolTokenType>();
    let poolWeightMap = new Map<string, number>();

    this.buildGraphFromPools(
      pools,
      graph,
      vertexMap,
      tokenRepeatTracker,
      edgeToPool,
      poolWeightMap,
    );

    const fromVertex = vertexMap.get(sourceToken);
    const toVertex = vertexMap.get(targetToken);
    if (!fromVertex || !toVertex) return null;

    const paths = Array.from(graph.findAllPath(fromVertex, toVertex));

    const pathResults: PathResult[] = [];

    for (const path of paths) {
      const tokenNames = path.map((v) => (v.value.includes('#') ? v.value.split('#')[0] : v.value));
      const simplified = this.simplifyPath(tokenNames);
      const { poolIds, isXToY } = this.extractPoolInfo(path, edgeToPool);
      pathResults.push({ tokens: simplified, pools: poolIds, isXToY });
    }

    const sorted = this.sortPaths(pathResults, poolWeightMap).slice(0, DRY_RUN_PATH_LEN);
    if (sorted.length === 0) {
      console.warn('No valid paths found');
      return null;
    }

    return sorted;
  }

  private buildGraphFromPools(
    pools: PoolTokenType[],
    graph: Graph,
    vertexMap: Map<string, GraphVertex>,
    tokenRepeatTracker: Map<string, number>,
    edgeToPool: Map<string, PoolTokenType>,
    poolWeightMap: Map<string, number>,
  ) {
    const tokenSet = new Set<string>();
    pools.forEach((pool) => {
      tokenSet.add(pool.tokenXType);
      tokenSet.add(pool.tokenYType);
    });
    tokenSet.forEach((token) => {
      vertexMap.set(token, new GraphVertex(token));
    });

    const fetchAvailableTokenKey = (token: string): string => {
      const count = tokenRepeatTracker.get(token) ?? 0;
      const nextCount = count + 1;
      tokenRepeatTracker.set(token, nextCount);
      return `${token}#${nextCount}`;
    };

    const addEdge = (from: string, to: string, pool: PoolTokenType, weight: number) => {
      let finalTo = to;
      const fromVertex = vertexMap.get(from);
      let toVertex = vertexMap.get(finalTo);

      if (graph.findEdge(fromVertex, toVertex)) {
        finalTo = fetchAvailableTokenKey(to);
        vertexMap.set(finalTo, new GraphVertex(finalTo));
        const virtualVertex = vertexMap.get(finalTo);
        graph.addEdge(new GraphEdge(virtualVertex, toVertex, 0));
      }

      toVertex = vertexMap.get(finalTo);
      graph.addEdge(new GraphEdge(fromVertex, toVertex, weight));

      edgeToPool.set(`${from}->${finalTo}`, pool);
      poolWeightMap.set(`${from}->${finalTo}`, weight);
    };

    for (const pool of pools) {
      const weight = 1 / Math.log(Number(pool.tvl) + 1);
      addEdge(pool.tokenXType, pool.tokenYType, pool, weight);
    }
  }

  private simplifyPath(tokenNames: string[]): string[] {
    const simplified: string[] = [];

    for (let i = 0; i < tokenNames.length; i++) {
      if (i === 0 || tokenNames[i] !== tokenNames[i - 1]) {
        simplified.push(tokenNames[i]);
      }
    }

    return simplified;
  }

  private extractPoolInfo(
    path: GraphVertex[],
    edgeToPool: Map<string, PoolTokenType>,
  ): { poolIds: string[]; isXToY: boolean[] } {
    const poolIds: string[] = [];
    const isXToY: boolean[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i].value;
      const to = path[i + 1].value;
      const edgeKey = `${from}->${to}`;
      const edgeKeyRev = `${to}->${from}`;

      const pool = edgeToPool.get(edgeKey) ?? edgeToPool.get(edgeKeyRev);
      if (!pool) continue;

      poolIds.push(pool.poolId);
      isXToY.push(pool.tokenXType === from);
    }

    return { poolIds, isXToY };
  }

  private sortPaths(paths: PathResult[], poolWeightMap: Map<string, number>): PathResult[] {
    const getWeightSum = (tokens: string[]) =>
      tokens.slice(0, -1).reduce((sum, _, idx) => {
        const key1 = `${tokens[idx]}->${tokens[idx + 1]}`;
        const key2 = `${tokens[idx + 1]}->${tokens[idx]}`;
        const weight = poolWeightMap.get(key1) ?? poolWeightMap.get(key2) ?? 0;
        return sum + weight;
      }, 0);

    return [...paths].sort((a, b) => {
      const lenA = a.tokens.length;
      const lenB = b.tokens.length;

      if (lenA !== lenB) {
        return lenA - lenB;
      }

      const weightA = getWeightSum(a.tokens);
      const weightB = getWeightSum(b.tokens);

      return weightB - weightA;
    });
  }

  public async devRunSwapAndChooseBestRoute(
    paths: PathResult[],
    pools: PoolTokenType[],
    sourceAmount: bigint,
  ) {
    const tasks = paths.map(async (path) => {
      const tx = new Transaction();
      const amountIn = sourceAmount > U64_MAX ? U64_MAX : sourceAmount;
      let output = 0n;
      try {
        output = await this.dryRunSwap(tx, path, pools, amountIn.toString());
      } catch (err) {
        console.info('Error in dry run swap:', err);
      }
      return { path, output };
    });
    const results = await Promise.all(tasks);
    const validResults = results.filter(
      (r): r is { path: PathResult; output: bigint } => r !== null,
    );

    if (validResults.length === 0) {
      console.warn('No valid swap paths found.');
      return null;
    }

    const best = validResults.reduce((max, current) =>
      current.output > max.output ? current : max,
    );

    return { path: best.path.pools, output: best.output };
  }

  private async dryRunSwap(
    tx: Transaction,
    pathResult: PathResult,
    pools: PoolTokenType[],
    sourceAmount: any,
  ) {
    const preSwapParams: PreSwapParam[] = [];

    for (let i = 0; i < pathResult.pools.length; i++) {
      const poolId = pathResult.pools[i];
      const isXtoY = pathResult.isXToY?.[i] ?? true;

      const pool = pools.find((p) => p.poolId === poolId);

      preSwapParams.push({
        tokenXType: pool.tokenXType,
        tokenYType: pool.tokenYType,
        poolId: pool.poolId,
        isXtoY,
      });
    }
    return this.sdk.Pool.preSwap(tx, preSwapParams, sourceAmount);
  }
}
