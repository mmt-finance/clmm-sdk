import { ExtendedPoolWithApr, PathResult, PoolTokenType, TokenSchema } from '../types';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { Graph } from 'graphlib';
import yen from 'k-shortest-path';
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
  ) {
    const graph = new Graph({ directed: false });
    const tokenRepeatTracker = new Map<string, number>();

    this.buildGraphFromPools(pools, graph, tokenRepeatTracker);

    // const allNodes = graph.nodes();
    // const fromNodes = allNodes.filter((n) => n.startsWith(sourceToken));
    // const toNodes = allNodes.filter((n) => n.startsWith(targetToken));
    // if (!fromNodes.length || !toNodes.length) return null;

    const weightFn = (edge: { v: string; w: string }) => {
      return graph.edge(edge.v, edge.w) || Infinity;
    };

    console.log(graph.edges());
    console.log(graph.nodes());
    console.log(graph.outEdges(sourceToken));

    const paths = yen.ksp(graph, sourceToken, targetToken, 10, weightFn);

    const pathResults: PathResult[] = [];

    for (const path of paths) {
      console.log(path);
    }

    for (const path of paths) {
      console.log('path:', path);
      const tokenNames = path.nodes.map((v) =>
        v.value.includes('#') ? v.value.split('#')[0] : v.value,
      );

      const simplified = this.simplifyPath(tokenNames);

      const { poolIds, isXToY } = this.extractPoolInfo(path);

      pathResults.push({ tokens: simplified, pools: poolIds, isXToY });
    }

    return await this.devRunSwapAndChooseBestRoute(
      pathResults,
      pools,
      amount,
      sourceTokenSchema.decimals,
    );
  }

  private buildGraphFromPools(
    pools: PoolTokenType[],
    graph: Graph,
    tokenRepeatTracker: Map<string, number>,
  ) {
    const tokenSet = new Set<string>();
    for (const pool of pools) {
      tokenSet.add(pool.tokenXType);
      tokenSet.add(pool.tokenYType);
    }
    tokenSet.forEach((token) => {
      graph.setNode(token);
    });
    const fetchAvailableTokenKey = (token: string): string => {
      const count = tokenRepeatTracker.get(token) ?? 0;
      const nextCount = count + 1;
      tokenRepeatTracker.set(token, nextCount);
      return `${token}#${nextCount}`;
    };

    const addEdge = (from: string, to: string, pool: PoolTokenType, weight: number) => {
      let finalTo = to;

      if (graph.hasEdge(from, to)) {
        finalTo = fetchAvailableTokenKey(to);
        graph.setNode(finalTo);
        graph.setEdge(finalTo, to, 0);
      }
      graph.setEdge(from, finalTo, weight);

      this.edgeToPool.set(`${from}->${finalTo}`, pool);
      this.poolWeightMap.set(`${from}->${finalTo}`, weight);
    };

    for (const pool of pools) {
      const weight = 1 / Math.log(Number(pool.tvl) + 1);
      addEdge(pool.tokenXType, pool.tokenYType, pool, weight);
    }
  }

  private simplifyPath(tokenNames: string[]): string[] {
    const seen = new Set<string>();
    const simplified: string[] = [];

    for (const token of tokenNames) {
      if (!seen.has(token)) {
        seen.add(token);
        simplified.push(token);
      }
    }

    return simplified;
  }

  private extractPoolInfo(path): { poolIds: string[]; isXToY: boolean[] } {
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

      // todo promiseAll
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
    // todo isSuccess

    const lastIndex = 2 * (pathResult.pools.length - 1) + 1;
    const amountOut = res.results?.[lastIndex]?.returnValues?.[0]?.[0];

    if (amountOut) {
      const amountOutParsed = bcs.u64().parse(new Uint8Array(amountOut));
      return BigInt(amountOutParsed);
    }

    return 0n;
  }
}
