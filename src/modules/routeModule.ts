import { Graph, PathResult, PoolTokenType, TokenSchema } from '../types';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { bcs } from '@mysten/sui/bcs';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { DRY_RUN_PATH_LEN } from '../utils/constants';
export class RouteModule implements BaseModule {
  protected _sdk: MmtSDK;

  constructor(sdk: MmtSDK) {
    this._sdk = sdk;
  }

  get sdk() {
    return this._sdk;
  }

  getRoutes(sourceToken: string, targetToken: string, pools: PoolTokenType[], maxHops: number = 4) {
    const graph: Graph = this.buildGraph(pools);
    const queue: {
      tokens: string[];
      pools: string[];
      isXToY: boolean[];
      usedPools: Set<string>;
    }[] = [
      {
        tokens: [sourceToken],
        pools: [],
        isXToY: [],
        usedPools: new Set(),
      },
    ];

    const maxPathLength = maxHops + 1;
    const results: PathResult[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentToken = current.tokens[current.tokens.length - 1];

      if (
        current.tokens.length > 1 &&
        current.tokens.length <= maxPathLength &&
        currentToken === targetToken
      ) {
        results.push({ tokens: current.tokens, pools: current.pools, isXToY: current.isXToY });
        continue;
      }

      if (current.tokens.length >= maxPathLength) continue;

      const nextPools = graph.get(currentToken) || [];
      for (const pool of nextPools) {
        if (current.usedPools.has(pool.poolId)) continue;

        const nextToken = pool.tokenXType === currentToken ? pool.tokenYType : pool.tokenXType;
        const isXToY = pool.tokenXType === currentToken;

        queue.push({
          tokens: [...current.tokens, nextToken],
          pools: [...current.pools, pool.poolId],
          isXToY: [...current.isXToY, isXToY],
          usedPools: new Set([...current.usedPools, pool.poolId]),
        });
      }
    }

    return results;
  }

  buildGraph(pools: PoolTokenType[]): Graph {
    const graph: Graph = new Map();

    for (const pool of pools) {
      if (!graph.has(pool.tokenXType)) graph.set(pool.tokenXType, []);
      if (!graph.has(pool.tokenYType)) graph.set(pool.tokenYType, []);
      graph.get(pool.tokenXType)!.push(pool);
      graph.get(pool.tokenYType)!.push(pool);
    }

    return graph;
  }

  async devRunSwapAndChooseBestRoute(
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

  async dryRunSwap(
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
      const pool = pools.find((p) => p.poolId === poolId);
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
      // @ts-ignore
      transactionBlock: tx,
      sender: normalizeSuiAddress('0x0'),
      additionalArgs: {
        showRawTxnDataAndEffects: true,
      },
    });

    const lastIndex = 2 * (pathResult.pools.length - 1) + 1;
    const amountOut = res.results?.[lastIndex]?.returnValues?.[0]?.[0];

    if (amountOut) {
      const amountOutParsed = bcs.u64().parse(new Uint8Array(amountOut));
      return BigInt(amountOutParsed);
    }

    return 0n;
  }

  async getBestRoute(
    paths: PathResult[],
    sourceToken: TokenSchema,
    pools: PoolTokenType[],
    amount: bigint,
  ): Promise<PathResult> {
    if (paths.length === 0) {
      throw new Error('No route found');
    }
    return await this.devRunSwapAndChooseBestRoute(paths, pools, amount, sourceToken.decimals);
  }

  sortRoutes(paths: PathResult[], pools: PoolTokenType[]): PathResult[] {
    const sorted = paths.sort((a, b) => a.tokens.length - b.tokens.length);
    const poolIdTvlMap = Object.fromEntries(pools.map((pool) => [pool.poolId, pool.tvl]));
    const groups = new Map<number, PathResult[]>();
    for (const path of sorted) {
      const len = path.tokens.length;
      if (!groups.has(len)) groups.set(len, []);
      groups.get(len)!.push(path);
    }

    const result: PathResult[] = [];
    const groupLens = [...groups.keys()].sort((a, b) => a - b); // 确保长度升序

    for (const len of groupLens) {
      if (result.length == DRY_RUN_PATH_LEN) break;
      const group = groups.get(len)!;
      if (result.length + group.length <= DRY_RUN_PATH_LEN) {
        result.push(...group);
      } else {
        const remaining = DRY_RUN_PATH_LEN - result.length;
        const remainingGroup = group
          .map((path) => {
            const totalTvl = path.pools.reduce((sum, poolId) => {
              return sum + (Number(poolIdTvlMap[poolId]) ?? 0);
            }, 0);
            return { path, totalTvl };
          })
          .sort((a, b) => b.totalTvl - a.totalTvl)
          .slice(0, remaining)
          .map((item) => item.path);

        result.push(...remainingGroup);
        break;
      }
    }
    return result;
  }
}
