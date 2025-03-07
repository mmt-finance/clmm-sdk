"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionModule = void 0;
const transactions_1 = require("@mysten/sui/transactions");
const bcs_1 = require("@mysten/sui/bcs");
const common_1 = require("../utils/common");
const types_1 = require("../types");
const poolUtils_1 = require("../utils/poolUtils");
const tickMath_1 = require("../utils/math/tickMath");
const bn_js_1 = require("bn.js");
const positionUtils_1 = require("../utils/positionUtils");
class PositionModule {
    constructor(sdk) {
        this._sdk = sdk;
    }
    get sdk() {
        return this._sdk;
    }
    openPosition(txb, pool, lower_tick_sqrt_price, upper_tick_sqrt_price, transferToAddress) {
        const [lowerTick1] = txb.moveCall({
            target: `${this.sdk.PackageId}::tick_math::get_tick_at_sqrt_price`,
            arguments: [
                typeof lower_tick_sqrt_price === 'string'
                    ? txb.pure.u128(BigInt(lower_tick_sqrt_price))
                    : lower_tick_sqrt_price,
            ],
        });
        const [upperTick1] = txb.moveCall({
            target: `${this.sdk.PackageId}::tick_math::get_tick_at_sqrt_price`,
            arguments: [
                typeof upper_tick_sqrt_price === 'string'
                    ? txb.pure.u128(BigInt(upper_tick_sqrt_price))
                    : upper_tick_sqrt_price,
            ],
        });
        const [tick_spacing] = txb.moveCall({
            target: `${this.sdk.PackageId}::i32::from_u32`,
            arguments: [txb.pure.u32(pool.tickSpacing)],
        });
        const [lowerTickmod] = txb.moveCall({
            target: `${this.sdk.PackageId}::i32::mod`,
            arguments: [lowerTick1, tick_spacing],
        });
        const [upperTickmod] = txb.moveCall({
            target: `${this.sdk.PackageId}::i32::mod`,
            arguments: [upperTick1, tick_spacing],
        });
        const [upperTick] = txb.moveCall({
            target: `${this.sdk.PackageId}::i32::sub`,
            arguments: [upperTick1, upperTickmod],
        });
        const [lowerTick] = txb.moveCall({
            target: `${this.sdk.PackageId}::i32::sub`,
            arguments: [lowerTick1, lowerTickmod],
        });
        const [positionObj] = txb.moveCall({
            target: `${this.sdk.PackageId}::liquidity::open_position`,
            arguments: [
                txb.object(pool.objectId),
                (0, common_1.txnArgument)(lowerTick, txb),
                (0, common_1.txnArgument)(upperTick, txb),
                txb.object(this.sdk.contractConst.versionId),
            ],
            typeArguments: [pool.tokenXType, pool.tokenYType],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([positionObj], txb.pure.address(transferToAddress));
        }
        else {
            return positionObj;
        }
    }
    closePosition(txb, positionId) {
        txb.moveCall({
            target: `${this.sdk.PackageId}::liquidity::close_position`,
            arguments: [(0, common_1.txnArgument)(positionId, txb), txb.object(this.sdk.contractConst.versionId)],
        });
    }
    updateRewardInfos(txb, positionId, reward_growth_inside) {
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::update_reward_infos`,
            arguments: [
                (0, common_1.txnArgument)(positionId, txb),
                txb.makeMoveVec({
                    type: 'u128',
                    elements: reward_growth_inside.map((item) => txb.pure.u128(item)),
                }),
            ],
        });
    }
    borrowMutRewardInfoObject(txb, positionId, reward_index) {
        const [rewardinfoObj] = txb.moveCall({
            target: `${this.sdk.PackageId}::position::try_borrow_mut_reward_info`,
            arguments: [(0, common_1.txnArgument)(positionId, txb), txb.pure.u64(reward_index)],
        });
        return rewardinfoObj;
    }
    async fetchPositionRpc(positionId) {
        const res = await this.sdk.rpcClient.getObject({
            id: positionId,
            options: { showContent: true },
        });
        const fields = res?.data?.content?.fields;
        const posRpcObj = (0, common_1.transformPositionRpcObject)(fields);
        return posRpcObj;
    }
    // ----------getter functions---------------
    async getAllUserPositions(address) {
        try {
            const [objects, pools, tokens] = await Promise.all([
                (0, poolUtils_1.fetchUserObjectsByPkg)(this.sdk.rpcClient, this.sdk.contractConst.publishedAt, address),
                this.sdk.Pool.getAllPools(),
                this.sdk.Pool.getAllTokens(),
            ]);
            const positions = objects.filter((obj) => obj.type === `${this.sdk.PackageId}::position::Position`);
            const positionRewardsInfo = await this.fetchRewards(positions, pools, address, this.sdk.rpcClient);
            const tokenPriceMap = new Map(tokens.map((token) => [token.coinType, Number(token.price)]));
            return positions
                .map((position) => {
                const positionData = position.fields;
                if (!positionData)
                    return null;
                const pool = pools.find((p) => p.poolId === positionData.pool_id);
                if (!pool)
                    return null;
                const liquidity = new bn_js_1.BN(positionData.liquidity ?? 0);
                const upperTick = Number(positionData.tick_upper_index.fields.bits ?? 0);
                const lowerTick = Number(positionData.tick_lower_index.fields.bits ?? 0);
                const upperTickSqrtPrice = tickMath_1.TickMath.tickIndexToSqrtPriceX64((0, tickMath_1.convertI32ToSigned)(upperTick));
                const lowerTickSqrtPrice = tickMath_1.TickMath.tickIndexToSqrtPriceX64((0, tickMath_1.convertI32ToSigned)(lowerTick));
                const lowerPrice = Number(tickMath_1.TickMath.sqrtPriceX64ToPrice(lowerTickSqrtPrice, pool.tokenX.decimals, pool.tokenY.decimals));
                const upperPrice = Number(tickMath_1.TickMath.sqrtPriceX64ToPrice(upperTickSqrtPrice, pool.tokenX.decimals, pool.tokenY.decimals));
                const { coinA, coinB } = (0, poolUtils_1.getCoinAmountFromLiquidity)(liquidity, new bn_js_1.BN(pool.currentSqrtPrice.toString()), lowerTickSqrtPrice, upperTickSqrtPrice, false);
                const calculateUsdValue = (amount, coinType) => (amount / 10 ** pool[coinType].decimals) * tokenPriceMap.get(pool[coinType].coinType);
                const totalUsdValue = calculateUsdValue(Number(coinA), 'tokenX') + calculateUsdValue(Number(coinB), 'tokenY');
                const rewardsData = positionRewardsInfo[positionData.id.id];
                const feeUsdValue = rewardsData
                    ? calculateUsdValue(rewardsData.feeCollected.amountX, 'tokenX') +
                        calculateUsdValue(rewardsData.feeCollected.amountY, 'tokenY')
                    : 0;
                const rewardsUsdValue = rewardsData
                    ? rewardsData.rewards.reduce((total, reward) => {
                        const coinType = reward.coinType.includes('0x2::sui::SUI')
                            ? '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
                            : reward.coinType;
                        const token = tokens.find((t) => t.coinType === coinType);
                        return total + (reward.amount / 10 ** token.decimals) * tokenPriceMap.get(coinType);
                    }, 0)
                    : 0;
                return {
                    objectId: positionData.id.id,
                    poolId: positionData.pool_id,
                    upperPrice,
                    lowerPrice,
                    upperTick,
                    lowerTick,
                    liquidity: new bn_js_1.BN(positionData.liquidity ?? 0),
                    amount: totalUsdValue,
                    status: types_1.PositionStatus[(0, positionUtils_1.getPositionStatus)(Number(pool.currentSqrtPrice), Number(lowerTickSqrtPrice), Number(upperTickSqrtPrice))],
                    claimableRewards: rewardsUsdValue + feeUsdValue,
                    rewarders: rewardsData ? rewardsData.rewards : [],
                    feeAmountXUsd: rewardsData
                        ? calculateUsdValue(rewardsData.feeCollected.amountX, 'tokenX')
                        : 0,
                    feeAmountYUsd: rewardsData
                        ? calculateUsdValue(rewardsData.feeCollected.amountY, 'tokenY')
                        : 0,
                    feeAmountX: rewardsData ? rewardsData.feeCollected.amountX : 0,
                    feeAmountY: rewardsData ? rewardsData.feeCollected.amountY : 0,
                };
            })
                .filter(Boolean);
        }
        catch (e) {
            console.error('Error in getAllUserPositions:', e);
            throw e;
        }
    }
    async fetchRewards(positions, pools, address, client) {
        const txb = new transactions_1.Transaction();
        positions.map((position) => {
            const positionData = position.fields;
            const pos_id = positionData.id.id;
            const pool_id = positionData.pool_id;
            const pool = pools.find((pool) => pool.poolId === pool_id);
            const poolModel = {
                objectId: pool_id,
                tokenXType: pool.tokenXType,
                tokenYType: pool.tokenYType,
            };
            const rewarders = pool.rewarders;
            if (rewarders?.length > 0) {
                this.sdk.Pool.collectAllRewards(txb, poolModel, rewarders, pos_id, address);
            }
            this.sdk.Pool.collectFee(txb, poolModel, pos_id, address);
        });
        const res = await client.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: address,
        });
        const positionRewardsData = {};
        for (const event of res.events) {
            const { type, parsedJson } = event;
            if (type === `${this.sdk.contractConst.publishedAt}::collect::CollectPoolRewardEvent`) {
                const { reward_coin_type, amount, position_id } = parsedJson;
                if (positionRewardsData[position_id]) {
                    positionRewardsData[position_id].rewards.push({
                        coinType: `0x${reward_coin_type.name}`,
                        amount: parseInt(amount),
                    });
                }
                else {
                    positionRewardsData[position_id] = {
                        rewards: [
                            {
                                coinType: `0x${reward_coin_type.name}`,
                                amount: parseInt(amount),
                            },
                        ],
                        feeCollected: {
                            amountX: 0,
                            amountY: 0,
                        },
                    };
                }
            }
            else if (type === `${this.sdk.contractConst.publishedAt}::collect::FeeCollectedEvent`) {
                const { amount_x, amount_y, position_id } = parsedJson;
                if (positionRewardsData[position_id]) {
                    positionRewardsData[position_id].feeCollected = {
                        amountX: parseInt(amount_x),
                        amountY: parseInt(amount_y),
                    };
                }
                else {
                    positionRewardsData[position_id] = {
                        rewards: [],
                        feeCollected: {
                            amountX: parseInt(amount_x),
                            amountY: parseInt(amount_y),
                        },
                    };
                }
            }
        }
        return positionRewardsData;
    }
    async getCoinOwedReward(positionId, reward_index) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::coins_owed_reward`,
            arguments: [(0, common_1.txnArgument)(positionId, txb), txb.pure.u64(reward_index)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const rewardAmount = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return rewardAmount;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getOwedCoinX(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::owed_coin_x`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const owedCoinX = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return owedCoinX;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getOwedCoinY(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::owed_coin_y`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const owedCoiny = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return owedCoiny;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getFeeGrowthInsideXLast(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::fee_growth_inside_x_last`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const feeGrowthValue = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return feeGrowthValue;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getFeeGrowthInsideYLast(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::fee_growth_inside_y_last`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const feeGrowthValue = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return feeGrowthValue;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getFeeRate(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::fee_rate`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const feeRate = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return feeRate;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getLiquidity(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::liquidity`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const liquidity = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return liquidity;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getRewardGrowthInsideLast(positionId, reward_index) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::reward_growth_inside_last`,
            arguments: [(0, common_1.txnArgument)(positionId, txb), txb.pure.u64(reward_index)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const rewardGrowthValue = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return rewardGrowthValue;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getTickLowerIndex(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::tick_lower_index`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const tickIndexValue = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return tickIndexValue;
        }
        catch (e) {
            console.log(e);
        }
    }
    async getTickUpperIndex(positionId) {
        const txb = new transactions_1.Transaction();
        txb.moveCall({
            target: `${this.sdk.PackageId}::position::tick_upper_index`,
            arguments: [(0, common_1.txnArgument)(positionId, txb)],
        });
        const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        try {
            const tickIndexValue = bcs_1.bcs
                .u64()
                .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
            return tickIndexValue;
        }
        catch (e) {
            console.log(e);
        }
    }
    async fetchAllRewards(positionId, address, pool) {
        const txb = new transactions_1.Transaction();
        const poolModel = {
            objectId: pool.poolId,
            tokenXType: pool.tokenXType,
            tokenYType: pool.tokenYType,
        };
        const rewarders = pool.rewarders;
        if (rewarders?.length > 0) {
            // @ts-ignore
            this.sdk.Pool.collectAllRewards(txb, poolModel, rewarders, positionId, address);
        }
        // @ts-ignore
        this.sdk.Pool.collectFee(txb, poolModel, positionId, address);
        const res = await this.sdk.rpcClient.devInspectTransactionBlock({
            transactionBlock: txb,
            sender: address,
        });
        console.log(res);
        const rewardsData = {
            feeCollected: {
                amountX: 0,
                amountY: 0,
            },
            rewards: [],
        };
        for (const event of res.events) {
            const { type, parsedJson } = event;
            if (type === `${this.sdk.PackageId}::collect::CollectPoolRewardEvent`) {
                const { reward_coin_type, amount } = parsedJson;
                rewardsData.rewards.push({
                    coinType: `0x${reward_coin_type.name}`,
                    amount: parseInt(amount),
                });
            }
            else if (type === `${this.sdk.PackageId}::collect::FeeCollectedEvent`) {
                const { amount_x, amount_y } = parsedJson;
                rewardsData.feeCollected = {
                    amountX: parseInt(amount_x),
                    amountY: parseInt(amount_y),
                };
            }
            console.log(rewardsData);
            return rewardsData;
        }
    }
}
exports.PositionModule = PositionModule;
