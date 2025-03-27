export interface PoolParams {
  objectId: string;
  tokenXType: string;
  tokenYType: string;
  isStable?: boolean;
  tickSpacing?: number;
}

export interface PoolRpc {
  id: string;
  token_y: number;
  token_x: number;
  lsp_supply: number;
  lsp_locked: number;
  lp_fee_percent: number;
  protocol_fee_percent: number;
  protocol_fee_x: number;
  protocol_fee_y: number;
  is_stable: boolean;
  scaleX: number;
  scaleY: number;
  is_swap_enabled: boolean;
  is_deposit_enabled: boolean;
  is_withdraw_enabled: boolean;
}

export interface PositionRpc {
  id: string;
  pool_id: string;
  fee_rate: number;
  type_x: string;
  type_y: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: bigint;
  fee_growth_inside_x_last: bigint;
  fee_growth_inside_y_last: bigint;
  owed_coin_x: number;
  owed_coin_y: number;
  reward_infos: PositionRewardInfoRpc[];
}

export interface PositionRewardInfoRpc {
  reward_growth_inside_last: bigint;
  coins_owed_reward: number;
}

export interface PoolApi {
  poolId: string;
  tokenXType: string;
  tokenYType: string;
  isStable: boolean;
  lpFeesPercent: string;
  protocolFeesPercent: string;
  currentSqrtPrice: string;
  currentTickIndex: string;
  liquidity: string;
  tokenXReserve: string;
  tokenYReserve: string;
  tvl: string;
  tickSpacing: number;
  timestamp: string;
  farm_id?: string;
  farm_source?: string;
}

export interface ExtendedPool extends PoolApi {
  volume24h: string;
  fees24h: string;
  rewarders: Rewarder[];
  /**
   * @deprecated: use pool.aprBreakdown.total
   */
  apy: string;
  tokenX: TokenSchema;
  tokenY: TokenSchema;
}

export interface ExtendedPoolWithApr extends ExtendedPool {
  aprBreakdown: {
    total: string;
    fee: string;
    rewards: { coinType: string; apr: string; amountPerDay: number }[];
  };
}

export interface TokenSchema {
  coinType: string;
  name: string;
  ticker: string;
  iconUrl: string;
  decimals: number;
  description: string;
  isVerified: boolean;
  isMmtWhitelisted: boolean;
  tokenType: string | null;
  price: string;
}

export interface PaginatedTickLiquidity {
  tickData: TickLiquidity[];
  hasNextPage: boolean;
}

export interface TickLiquidity {
  poolId: string;
  tickIndex: number;
  liquidity: number;
}

export type Rewarder = {
  coin_type: string;
  flow_rate: number;
  reward_amount: number;
  rewards_allocated: number;
  hasEnded: boolean;
};

export interface RewardersAPYSchema {
  pool_id: string; // Foreign key to PoolSchema
  rewarders: Rewarder[]; // Array of coin types
  apy: number; // APY value
}

export interface PositionV3 {
  objectId: string;
  poolId: string;
  status: string;
  lowerPrice: number;
  upperPrice: number;
  liquidity: number;
  amount: number;
  claimableRewards: number;
  rewarders: PositionReward[];
}

export interface PositionReward {
  coinType: string;
  amount: number;
  total_usd_value?: number;
}

export enum PositionStatus {
  'Above Range' = 0,
  'In Range' = 1,
  'Below Range' = 2,
}

export interface RewardsData {
  feeCollected: {
    amountX: number;
    amountY: number;
  };
  rewards: Reward[];
}

export interface Reward {
  coinType: string;
  amount: number;
}

export interface ClmmConsts {
  packageId: string;
  publishedAt: string;
  aclId: string;
  adminCapId: string;
  slippageCheckPackageId: string;
  globalConfigId: string;
  versionId: string;
}

export interface PoolTokenType {
  tokenXType: string;
  tokenYType: string;
  poolId: string;
}

export interface PathResult {
  tokens: string[];
  pools: string[];
}

export type Graph = Map<string, PoolTokenType[]>;

export type SuiAddress = string;
