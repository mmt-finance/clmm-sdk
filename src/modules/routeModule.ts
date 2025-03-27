import { Graph, PathResult, PoolTokenType } from '../types';

export function getRoutes(
  sourceToken: string,
  targetToken: string,
  pools: PoolTokenType[],
  maxHops = 4,
) {
  const graph: Graph = this.buildGraph(pools);
  const queue: {
    tokens: string[];
    pools: string[];
    usedPools: Set<string>;
  }[] = [
    {
      tokens: [sourceToken],
      pools: [],
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
      results.push({ tokens: current.tokens, pools: current.pools });
      continue;
    }

    if (current.tokens.length >= maxPathLength) continue;

    const nextPools = graph.get(currentToken) || [];
    for (const pool of nextPools) {
      if (current.usedPools.has(pool.poolId)) continue;

      const nextToken = pool.tokenXType === currentToken ? pool.tokenYType : pool.tokenXType;

      queue.push({
        tokens: [...current.tokens, nextToken],
        pools: [...current.pools, pool.poolId],
        usedPools: new Set([...current.usedPools, pool.poolId]),
      });
    }
  }

  return results;
}

export function buildGraph(pools: PoolTokenType[]): Graph {
  const graph: Graph = new Map();

  for (const pool of pools) {
    if (!graph.has(pool.tokenXType)) graph.set(pool.tokenXType, []);
    if (!graph.has(pool.tokenYType)) graph.set(pool.tokenYType, []);
    graph.get(pool.tokenXType)!.push(pool);
    graph.get(pool.tokenYType)!.push(pool);
  }

  return graph;
}

export function getBestRoute(paths: PathResult[]): PathResult {
  return;
}

export function sortRoutes(paths: PathResult[]): PathResult[] {
  return;
}
