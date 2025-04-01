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
    maxHops = 4,
  ): Promise<PathResult | null> {
    const graph = new Graph(false);
    const vertexMap = new Map<string, GraphVertex>();
    const tokenXToYRepeatTracker = new Map<string, number>();
    const tokenRepeatTracker = new Map<string, number>();

    const getVertex = (key: string) => {
      if (!vertexMap.has(key)) {
        vertexMap.set(key, new GraphVertex(key));
      }
      return vertexMap.get(key)!;
    };

    const getAvailableTokenKey = (token: string): string => {
      const count = tokenRepeatTracker.get(token) ?? 0;
      const nextCount = count + 1;
      const virtual = `${token}#${nextCount}`;
      tokenRepeatTracker.set(token, nextCount);
      return virtual;
    };

    const addEdge = (from: string, to: string, pool: PoolTokenType, weight: number) => {
      const tokenXToYRepeat = tokenXToYRepeatTracker.get(`${from}-${to}`) ?? 0;
      const toRepeate = tokenRepeatTracker.get(to) ?? 0;
      if (tokenXToYRepeat <= toRepeate && tokenXToYRepeat != 0) {
        tokenXToYRepeatTracker.set(`${from}-${to}`, tokenXToYRepeat + 1);
        return;
      }
      let finalTo = to;
      const fromVertex = getVertex(from);
      let toVertex = getVertex(finalTo);

      if (graph.findEdge(fromVertex, toVertex)) {
        const virtualTo = getAvailableTokenKey(to);
        finalTo = virtualTo;

        const virtualVertex = getVertex(finalTo);
        const toVertex = getVertex(to);

        graph.addEdge(new GraphEdge(virtualVertex, toVertex, 0));
      }
      toVertex = getVertex(finalTo);
      graph.addEdge(new GraphEdge(fromVertex, toVertex, weight));

      tokenXToYRepeatTracker.set(`${from}-${to}`, tokenXToYRepeat + 1);
      this.edgeToPool.set(`${from}->${finalTo}`, pool);
      this.poolWeightMap.set(`${from}->${finalTo}`, weight);
    };

    const pathResults: PathResult[] = [];
    for (const pool of pools) {
      const weight = 1 / Math.log(Number(pool.tvl) + 1);
      addEdge(pool.tokenXType, pool.tokenYType, pool, weight);
    }

    const fromVertex = vertexMap.get(sourceToken);
    const toVertex = vertexMap.get(targetToken);
    if (!fromVertex || !toVertex) return null;

    const pathIters = graph.findAllPath(fromVertex, toVertex);
    const paths = Array.from(pathIters);

    for (const path of paths) {
      const tokenNames = path.map((v) => (v.value.includes('#') ? v.value.split('#')[0] : v.value));
      const group = new Map<string, number>();
      const seen = new Set<string>();
      const simplified: string[] = [];
      let isInvalid = false;

      for (const token of tokenNames) {
        const count = group.get(token) || 0;
        group.set(token, count + 1);
        if (count + 1 > 2) {
          isInvalid = true;
          break;
        }

        if (!seen.has(token)) {
          seen.add(token);
          simplified.push(token);
        }
      }

      if (simplified.length > maxHops + 1 || isInvalid) {
        continue;
      }

      const poolIds: string[] = [];
      const isXToY: boolean[] = [];

      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i].value;
        const to = path[i + 1].value;
        const edgeKey = `${from}->${to}`;
        const edgeKeyReserve = `${to}->${from}`;
        const pool = this.edgeToPool.get(edgeKey)
          ? this.edgeToPool.get(edgeKey)
          : this.edgeToPool.get(edgeKeyReserve);
        if (!pool) continue;
        poolIds.push(pool.poolId);
        isXToY.push(pool.tokenXType === from);
      }

      const pathResult: PathResult = {
        tokens: simplified,
        pools: poolIds,
        isXToY,
      };
      pathResults.push(pathResult);
    }
    console.log('pathResults:', pathResults);
    console.log('pathResults length:', pathResults.length);

    const sorted = [...pathResults.values()].sort((a, b) => {
      if (a.tokens.length !== b.tokens.length) return a.tokens.length - b.tokens.length;
      const getWeightSum = (tokens: string[]) =>
        tokens.slice(0, -1).reduce((sum, token, idx) => {
          const key1 = `${tokens[idx]}->${tokens[idx + 1]}`;
          const key2 = `${tokens[idx + 1]}->${tokens[idx]}`;
          const weight = this.poolWeightMap.get(key1) ?? this.poolWeightMap.get(key2) ?? 0;
          return sum + weight;
        }, 0);

      const weightA = getWeightSum(a.tokens);
      const weightB = getWeightSum(b.tokens);
      return weightA - weightB;
    });

    const top10 = sorted.slice(0, 10);
    return await this.devRunSwapAndChooseBestRoute(
      top10,
      pools,
      amount,
      sourceTokenSchema.decimals,
    );
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
