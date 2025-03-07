import { TransactionArgument, Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { PoolParams, TickLiquidity, ExtendedPool, Rewarder } from '../types';
import { MmtSDK } from '../sdk';
import { BaseModule } from '../interfaces/BaseModule';
import BN from 'bn.js';
import Decimal from 'decimal.js';
export declare const Q_64 = "18446744073709551616";
export declare class PoolModule implements BaseModule {
    protected _sdk: MmtSDK;
    constructor(sdk: MmtSDK);
    get sdk(): MmtSDK;
    createPool(txb: Transaction, fee_rate: number, price: string, coinXType: string, coinYType: string, decimalsX: number, decimalsY: number): void;
    swap(txb: Transaction, pool: PoolParams, amount: bigint | TransactionArgument, inputCoin: any, isXtoY: boolean, transferToAddress?: string, limitSqrtPrice?: bigint): {
        $kind: "NestedResult";
        NestedResult: [number, number];
    };
    flashSwap(txb: Transaction, pool: PoolParams, amountX: bigint, amountY: bigint, inputCoin: any, transferToAddress?: string): import("@mysten/sui/transactions").TransactionResult;
    removeLiquidity(txb: Transaction, pool: PoolParams, positionId: string, liquidity: bigint | TransactionArgument, min_amount_x: bigint, min_amount_y: bigint, transferToAddress?: string): {
        removeLpCoinA: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
        removeLpCoinB: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
    };
    addLiquidity(txb: Transaction, pool: PoolParams, position: string | TransactionArgument, coinX: string | TransactionArgument, coinY: string | TransactionArgument, min_amount_x: bigint, min_amount_y: bigint, transferToAddress?: string): Promise<{
        coinA: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
        coinB: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
    }>;
    addLiquiditySingleSided(txb: Transaction, pool: PoolParams, position: string | TransactionArgument, inputCoin: TransactionObjectArgument, min_amount_x: bigint, min_amount_y: bigint, isXtoY: boolean, transferToAddress?: string, limitSqrtPrice?: bigint): Promise<{
        coinAOut: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
        coinBOut: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
        swapCoin: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
    }>;
    collectFee(txb: Transaction, pool: PoolParams, positionId: string | TransactionArgument, transferToAddress?: string): {
        feeCoinA: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
        feeCoinB: {
            $kind: "NestedResult";
            NestedResult: [number, number];
        };
    };
    collectReward(txb: Transaction, pool: PoolParams, positionId: string | TransactionArgument, rewardCoinType: string, transferToAddress?: string): {
        $kind: "NestedResult";
        NestedResult: [number, number];
    };
    collectAllRewards(txb: Transaction, pool: PoolParams, rewarders: Rewarder[], positionId: string | TransactionArgument, transferToAddress?: string): any[];
    collectAllPoolsRewards(userAddress: string, pools: ExtendedPool[]): Promise<Transaction>;
    fetchRewardsAndFee(positions: any, pools: ExtendedPool[], address: string): Promise<Transaction>;
    migratevSuiPosition(vSuiPositionId: string, range: number, txb: Transaction, transferToAddress: string): Promise<void>;
    getAllPools(headers?: HeadersInit): Promise<ExtendedPool[]>;
    getPool(poolId: string, headers?: HeadersInit): Promise<ExtendedPool>;
    private validatePoolsId;
    getAllTokens(headers?: HeadersInit): Promise<import("../types").TokenSchema[]>;
    getToken(tokenId: string, headers?: HeadersInit): Promise<import("../types").TokenSchema>;
    fetchAllTickLiquidities(poolId: string, headers?: HeadersInit): Promise<TickLiquidity[]>;
    fetchTickLiquiditity(poolId: string, offset: number, limit: number, headers?: HeadersInit): Promise<any>;
    getRewardersApy(poolId: string, headers?: HeadersInit): Promise<import("../types").RewardersAPYSchema | import("../types").RewardersAPYSchema[]>;
    estPositionAPRWithDeltaMethod(currentTickIndex: number, lowerTickIndex: number, upperTickIndex: number, currentSqrtPriceX64: BN, poolLiquidity: BN, decimalsA: number, decimalsB: number, feeRate: number, amountAStr: string, amountBStr: string, swapVolumeStr: string, coinAPriceStr: string, coinBPriceStr: string, poolRewarders: any[]): {
        feeAPR: Decimal;
        rewarderApr: any[];
    };
    calculatePoolValidTVL(amountA: BN, amountB: BN, decimalsA: number, decimalsB: number, coinAPrice: Decimal, coinBPrice: Decimal): Decimal;
    getRewardsAPY(pool: ExtendedPool): Promise<{
        feeAPR: Decimal;
        rewarderApr: any[];
    }>;
}
