import { ExtendedPoolWithApr, PathResult, PoolTokenType, TokenSchema } from '../types';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { Graph, GraphVertex, GraphEdge } from '@syntsugar/cc-graph';
import { DRY_RUN_PATH_LEN } from '../utils/constants';

export class RouteModule implements BaseModule {
  protected _sdk: MmtSDK;
  private edgeToPool = new Map<string, PoolTokenType>();
  private poolWeightMap = new Map<string, number>();

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
      .filter((x) => Number(x.tvl) > 0)
      .map((x) => ({
        poolId: x.poolId,
        tokenXType: x.tokenXType,
        tokenYType: x.tokenYType,
        tvl: x.tvl,
      }));

    const pathResults: PathResult[] = await this.getRoutes(sourceToken, targetToken, pools);
    console.log('pathResults:', pathResults);
    console.log('pathResults length:', pathResults.length);
    if (!pathResults) {
      console.error('No paths found:', sourceToken, targetToken);
      return null;
    }

    const best = await this.devRunSwapAndChooseBestRoute(
      pathResults,
      pools,
      amount,
      sourceTokenSchema.decimals,
    );
    if (!best) throw new Error('No path found');
    return best.pools;
  }

  private async getRoutes(sourceToken: string, targetToken: string, pools: PoolTokenType[]) {
    const graph = new Graph(false);
    const vertexMap = new Map<string, GraphVertex>();
    const tokenRepeatTracker = new Map<string, number>();

    this.buildGraphFromPools(pools, graph, vertexMap, tokenRepeatTracker);

    const fromVertex = vertexMap.get(sourceToken);
    const toVertex = vertexMap.get(targetToken);
    if (!fromVertex || !toVertex) return null;

    const paths = Array.from(graph.findAllPath(fromVertex, toVertex));

    const pathResults: PathResult[] = [];

    for (const path of paths) {
      const tokenNames = path.map((v) => (v.value.includes('#') ? v.value.split('#')[0] : v.value));
      const simplified = this.simplifyPath(tokenNames);
      const { poolIds, isXToY } = this.extractPoolInfo(path);
      pathResults.push({ tokens: simplified, pools: poolIds, isXToY });
    }
    const sorted = this.sortPaths(pathResults).slice(0, DRY_RUN_PATH_LEN);
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

      this.edgeToPool.set(`${from}->${finalTo}`, pool);
      this.poolWeightMap.set(`${from}->${finalTo}`, weight);
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

  private extractPoolInfo(path: GraphVertex[]): { poolIds: string[]; isXToY: boolean[] } {
    const poolIds: string[] = [];
    const isXToY: boolean[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i].value;
      const to = path[i + 1].value;
      const edgeKey = `${from}->${to}`;
      const edgeKeyRev = `${to}->${from}`;

      const pool = this.edgeToPool.get(edgeKey) ?? this.edgeToPool.get(edgeKeyRev);
      if (!pool) continue;

      poolIds.push(pool.poolId);
      isXToY.push(pool.tokenXType === from);
    }

    return { poolIds, isXToY };
  }

  private sortPaths(paths: PathResult[]): PathResult[] {
    const getWeightSum = (tokens: string[]) =>
      tokens.slice(0, -1).reduce((sum, _, idx) => {
        const key1 = `${tokens[idx]}->${tokens[idx + 1]}`;
        const key2 = `${tokens[idx + 1]}->${tokens[idx]}`;
        const weight = this.poolWeightMap.get(key1) ?? this.poolWeightMap.get(key2) ?? 0;
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

  private async devRunSwapAndChooseBestRoute(
    paths: PathResult[],
    pools: PoolTokenType[],
    sourceAmount: bigint,
    sourceDecimals: number,
  ) {
    const tasks = paths.map(async (path) => {
      try {
        const tx = new Transaction();
        const sourceAmountIn = tx.pure.u64(Number(sourceAmount) * 10 ** sourceDecimals);
        const output = await this.dryRunSwap(tx, path, pools, sourceAmountIn);
        return { path, output };
      } catch (err) {
        console.warn(`Dry run failed on path:`, path, err);
        return null;
      }
    });
    const results = await Promise.all(tasks);
    const validResults = results.filter(
      (r): r is { path: PathResult; output: bigint } => r !== null,
    );

    if (validResults.length === 0) {
      console.warn('No valid swap paths found.');
      return null;
    }

    const best = validResults.reduce(
      (max, current) => (current.output > max.output ? current : max),
      { path: null, output: BigInt(0) } as { path: PathResult | null; output: bigint },
    );

    return best.path;
  }

  private async dryRunSwap(
    tx: Transaction,
    pathResult: PathResult,
    pools: PoolTokenType[],
    sourceAmount: any,
  ) {
    try {
      const swapDirectionMap = new Map<string, boolean>();
      pathResult.pools.forEach((poolId, index) => {
        const direction = pathResult.isXToY[index];
        swapDirectionMap.set(poolId, direction);
      });
      let inputAmount = sourceAmount;

      const LowLimitPrice = BigInt('4295048017');
      const HighLimitPrice = BigInt('79226673515401279992447579050');

      for (const poolId of pathResult.pools) {
        const pool = pools.find((p) => p.poolId === poolId)!;
        const { tokenXType, tokenYType } = pool;
        const isXtoY = swapDirectionMap.get(poolId);

        const swapResult = tx.moveCall({
          target: `${this.sdk.PackageId}::trade::compute_swap_result`,
          typeArguments: [tokenXType, tokenYType],
          arguments: [
            tx.object(poolId),
            tx.pure.bool(isXtoY),
            tx.pure.bool(true),
            tx.pure.u128(isXtoY ? LowLimitPrice : HighLimitPrice),
            inputAmount,
          ],
        });

        inputAmount = tx.moveCall({
          target: `${this.sdk.PackageId}::trade::get_state_amount_calculated`,
          arguments: [swapResult],
        });
      }

      const res = await this.sdk.rpcClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: normalizeSuiAddress('0x0'),
        additionalArgs: { showRawTxnDataAndEffects: true },
      });

      if (res.error || res.effects?.status.status !== 'success') {
        console.error(`Dry run failed: ${res.error || 'Unknown failure'}`);
        return 0n;
      }

      const lastIndex = 2 * (pathResult.pools.length - 1) + 1;
      const amountOut = res.results?.[lastIndex]?.returnValues?.[0]?.[0];

      if (!amountOut) {
        return 0n;
      }
      const amountOutParsed = bcs.u64().parse(new Uint8Array(amountOut));
      return BigInt(amountOutParsed);
    } catch (err) {
      console.error('Error in dry run swap:', err);
      return 0n;
    }
  }
}
