import { ExtendedPoolWithApr, PathResult, PoolTokenType, TokenSchema } from '../types';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { Graph, GraphVertex, GraphEdge } from '@syntsugar/cc-graph';

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

    const best = await this.getRoutes(sourceToken, targetToken, amount, sourceTokenSchema, pools);
    if (!best) throw new Error('No path found');
    return best.pools;
  }

  private async getRoutes(
    sourceToken: string,
    targetToken: string,
    amount: bigint,
    sourceTokenSchema: TokenSchema,
    pools: PoolTokenType[],
    maxHops?: 4,
  ) {
    const graph = new Graph(false);
    const vertexMap = new Map<string, GraphVertex>();
    const tokenRepeatTracker = new Map<string, number>();
    const tokenXToYRepeatTracker = new Map<string, number>();

    this.buildGraphFromPools(pools, graph, vertexMap, tokenRepeatTracker, tokenXToYRepeatTracker);

    const fromVertex = vertexMap.get(sourceToken);
    const toVertex = vertexMap.get(targetToken);
    if (!fromVertex || !toVertex) return null;

    const paths = Array.from(graph.findAllPath(fromVertex, toVertex));

    const pathResults: PathResult[] = [];

    for (const path of paths) {
      const tokenNames = path.map((v) => (v.value.includes('#') ? v.value.split('#')[0] : v.value));

      const { valid, simplified } = this.isPathValid(tokenNames, maxHops);
      if (!valid) continue;

      const { poolIds, isXToY } = this.extractPoolInfo(path);
      if (poolIds.length !== path.length - 1) continue;

      pathResults.push({ tokens: simplified, pools: poolIds, isXToY });
    }

    const sorted = this.sortPaths(pathResults);
    const top10 = sorted.slice(0, 10);

    return await this.devRunSwapAndChooseBestRoute(
      top10,
      pools,
      amount,
      sourceTokenSchema.decimals,
    );
  }

  private buildGraphFromPools(
    pools: PoolTokenType[],
    graph: Graph,
    vertexMap: Map<string, GraphVertex>,
    tokenRepeatTracker: Map<string, number>,
    tokenXToYRepeatTracker: Map<string, number>,
  ) {
    const getVertex = (key: string) => {
      if (!vertexMap.has(key)) {
        vertexMap.set(key, new GraphVertex(key));
      }
      return vertexMap.get(key)!;
    };

    const getAvailableTokenKey = (token: string): string => {
      const count = tokenRepeatTracker.get(token) ?? 0;
      const nextCount = count + 1;
      tokenRepeatTracker.set(token, nextCount);
      return `${token}#${nextCount}`;
    };

    const addEdge = (from: string, to: string, pool: PoolTokenType, weight: number) => {
      const key = `${from}-${to}`;
      const repeatCount = tokenXToYRepeatTracker.get(key) ?? 0;
      const toCount = tokenRepeatTracker.get(to) ?? 0;

      if (repeatCount <= toCount && repeatCount !== 0) {
        tokenXToYRepeatTracker.set(key, repeatCount + 1);
        return;
      }

      let finalTo = to;
      const fromVertex = getVertex(from);
      let toVertex = getVertex(finalTo);

      if (graph.findEdge(fromVertex, toVertex)) {
        finalTo = getAvailableTokenKey(to);
        const virtualVertex = getVertex(finalTo);
        const realVertex = getVertex(to);
        graph.addEdge(new GraphEdge(virtualVertex, realVertex, 0));
      }

      toVertex = getVertex(finalTo);
      graph.addEdge(new GraphEdge(fromVertex, toVertex, weight));

      tokenXToYRepeatTracker.set(key, repeatCount + 1);
      this.edgeToPool.set(`${from}->${finalTo}`, pool);
      this.poolWeightMap.set(`${from}->${finalTo}`, weight);
    };

    for (const pool of pools) {
      const weight = 1 / Math.log(Number(pool.tvl) + 1);
      addEdge(pool.tokenXType, pool.tokenYType, pool, weight);
    }
  }

  private isPathValid(
    tokenNames: string[],
    maxHops: number,
  ): { valid: boolean; simplified: string[] } {
    const group = new Map<string, number>();
    const seen = new Set<string>();
    const simplified: string[] = [];

    for (const token of tokenNames) {
      const count = group.get(token) || 0;
      group.set(token, count + 1);
      if (count + 1 > 2) return { valid: false, simplified: [] };

      if (!seen.has(token)) {
        seen.add(token);
        simplified.push(token);
      }
    }

    if (simplified.length > maxHops + 1) return { valid: false, simplified: [] };

    return { valid: true, simplified };
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
      if (a.tokens.length !== b.tokens.length) {
        return a.tokens.length - b.tokens.length;
      }
      return getWeightSum(a.tokens) - getWeightSum(b.tokens);
    });
  }

  private async devRunSwapAndChooseBestRoute(
    paths: PathResult[],
    pools: PoolTokenType[],
    sourceAmount: bigint,
    sourceDecimals: number,
  ) {
    let bestPath: PathResult | null = null;
    let maxOutput = BigInt(0);
    for (const path of paths) {
      let output = BigInt(0);

      try {
        const tx = new Transaction();
        const sourceAmountIn = tx.pure.u64(Number(sourceAmount) * 10 ** sourceDecimals);
        output = await this.dryRunSwap(tx, path, pools, sourceAmountIn);
      } catch (err) {
        console.warn(`Dry run failed on path:`, path, err);
        continue;
      }

      if (output > maxOutput) {
        maxOutput = output;
        bestPath = path;
      }
    }

    return bestPath;
  }

  private async dryRunSwap(
    tx: Transaction,
    pathResult: PathResult,
    pools: PoolTokenType[],
    sourceAmount: any,
  ) {
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

    const lastIndex = 2 * (pathResult.pools.length - 1) + 1;
    const amountOut = res.results?.[lastIndex]?.returnValues?.[0]?.[0];

    if (amountOut) {
      const amountOutParsed = bcs.u64().parse(new Uint8Array(amountOut));
      return BigInt(amountOutParsed);
    }

    return 0n;
  }
}
