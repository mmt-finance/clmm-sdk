import { TransactionArgument, Transaction } from '@mysten/sui/transactions';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { ExtendedPool, PoolParams, RewardsData } from '../types';
import { SuiClient } from '@mysten/sui/dist/cjs/client';
export declare class PositionModule implements BaseModule {
    protected _sdk: MmtSDK;
    constructor(sdk: MmtSDK);
    get sdk(): MmtSDK;
    openPosition(txb: Transaction, pool: PoolParams, lower_tick_sqrt_price: string | TransactionArgument, upper_tick_sqrt_price: string | TransactionArgument, transferToAddress?: string): {
        $kind: "NestedResult";
        NestedResult: [number, number];
    };
    closePosition(txb: Transaction, positionId: string | TransactionArgument): void;
    updateRewardInfos(txb: Transaction, positionId: string | TransactionArgument, reward_growth_inside: number[]): void;
    borrowMutRewardInfoObject(txb: Transaction, positionId: string | TransactionArgument, reward_index: number): {
        $kind: "NestedResult";
        NestedResult: [number, number];
    };
    fetchPositionRpc(positionId: string): Promise<import("../types").PositionRpc>;
    getAllUserPositions(address: string): Promise<{
        objectId: any;
        poolId: any;
        upperPrice: number;
        lowerPrice: number;
        upperTick: number;
        lowerTick: number;
        liquidity: import("bn.js");
        amount: number;
        status: string;
        claimableRewards: number;
        rewarders: import("../types").Reward[];
        feeAmountXUsd: number;
        feeAmountYUsd: number;
        feeAmountX: number;
        feeAmountY: number;
    }[]>;
    fetchRewards(positions: any, pools: ExtendedPool[], address: string, client: SuiClient): Promise<Record<string, RewardsData>>;
    getCoinOwedReward(positionId: string | TransactionArgument, reward_index: number): Promise<string>;
    getOwedCoinX(positionId: string | TransactionArgument): Promise<string>;
    getOwedCoinY(positionId: string | TransactionArgument): Promise<string>;
    getFeeGrowthInsideXLast(positionId: string | TransactionArgument): Promise<string>;
    getFeeGrowthInsideYLast(positionId: string | TransactionArgument): Promise<string>;
    getFeeRate(positionId: string | TransactionArgument): Promise<string>;
    getLiquidity(positionId: string | TransactionArgument): Promise<string>;
    getRewardGrowthInsideLast(positionId: string | TransactionArgument, reward_index: number): Promise<string>;
    getTickLowerIndex(positionId: string | TransactionArgument): Promise<string>;
    getTickUpperIndex(positionId: string | TransactionArgument): Promise<string>;
    fetchAllRewards(positionId: string, address: string, pool: ExtendedPool): Promise<{
        feeCollected: {
            amountX: number;
            amountY: number;
        };
        rewards: any[];
    }>;
}
