"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolModule = exports.Q_64 = void 0;
const transactions_1 = require("@mysten/sui/transactions");
const constants_1 = require("../utils/constants");
const common_1 = require("../utils/common");
const utils_1 = require("@mysten/sui/utils");
const poolUtils_1 = require("../utils/poolUtils");
const bn_js_1 = __importDefault(require("bn.js"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const tickMath_1 = require("../utils/math/tickMath");
const commonMath_1 = require("../utils/math/commonMath");
exports.Q_64 = '18446744073709551616';
class PoolModule {
    constructor(sdk) {
        this._sdk = sdk;
    }
    get sdk() {
        return this._sdk;
    }
    createPool(txb, fee_rate, price, coinXType, coinYType, decimalsX, decimalsY) {
        const [pool] = txb.moveCall({
            target: `${this.sdk.PackageId}::create_pool::new`,
            typeArguments: [coinXType, coinYType],
            arguments: [
                txb.object(this.sdk.contractConst.globalConfigId),
                txb.pure.u64(fee_rate),
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        const sqrtPrice = tickMath_1.TickMath.priceToSqrtPriceX64(new decimal_js_1.default(price), decimalsX, decimalsY);
        txb.moveCall({
            target: `${this.sdk.PackageId}::pool::initialize`,
            typeArguments: [coinXType, coinYType],
            arguments: [
                pool,
                txb.pure.u128(BigInt(sqrtPrice.toString())),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
            ],
        });
        txb.moveCall({
            target: `${this.sdk.PackageId}::pool::transfer`,
            typeArguments: [coinXType, coinYType],
            arguments: [pool],
        });
    }
    swap(txb, pool, amount, inputCoin, isXtoY, transferToAddress, limitSqrtPrice) {
        const LowLimitPrice = BigInt('4295048017');
        const HighLimitPrice = BigInt('79226673515401279992447579050');
        const poolObject = txb.object(pool.objectId);
        if (!limitSqrtPrice) {
            limitSqrtPrice = isXtoY ? LowLimitPrice : HighLimitPrice;
        }
        const [receive_a, receive_b, flash_receipt] = txb.moveCall({
            target: `${this.sdk.PackageId}::trade::flash_swap`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                poolObject,
                txb.pure.bool(isXtoY),
                txb.pure.bool(true),
                typeof amount == 'bigint' ? txb.pure.u64(amount) : amount,
                txb.pure.u128(limitSqrtPrice),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        txb.moveCall({
            target: `0x2::balance::destroy_zero`,
            arguments: [isXtoY ? receive_a : receive_b],
            typeArguments: [isXtoY ? pool.tokenXType : pool.tokenYType],
        });
        const [zeroCoin] = txb.moveCall({
            target: `0x2::coin::zero`,
            arguments: [],
            typeArguments: [isXtoY ? pool.tokenYType : pool.tokenXType],
        });
        const [coinADebt, coinBDebt] = txb.moveCall({
            target: `${this.sdk.PackageId}::trade::swap_receipt_debts`,
            typeArguments: [],
            arguments: [flash_receipt],
        });
        const pay_coin_a = isXtoY
            ? txb.moveCall({
                target: `0x2::coin::split`,
                arguments: [inputCoin, coinADebt],
                typeArguments: [pool.tokenXType],
            })
            : zeroCoin;
        const pay_coin_b = isXtoY
            ? zeroCoin
            : txb.moveCall({
                target: `0x2::coin::split`,
                arguments: [inputCoin, coinBDebt],
                typeArguments: [pool.tokenYType],
            });
        const pay_coin_a_balance = txb.moveCall({
            target: `0x2::coin::into_balance`,
            typeArguments: [pool.tokenXType],
            arguments: [pay_coin_a],
        });
        const pay_coin_b_balance = txb.moveCall({
            target: `0x2::coin::into_balance`,
            typeArguments: [pool.tokenYType],
            arguments: [pay_coin_b],
        });
        txb.moveCall({
            target: `${this.sdk.PackageId}::trade::repay_flash_swap`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                poolObject,
                flash_receipt,
                pay_coin_a_balance,
                pay_coin_b_balance,
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        txb.moveCall({
            target: `${this.sdk.contractConst.slippageCheckPackageId}::slippage_check::assert_slippage`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [poolObject, txb.pure.u128(limitSqrtPrice), txb.pure.bool(isXtoY)],
        });
        const [outputCoin] = txb.moveCall({
            target: `0x2::coin::from_balance`,
            typeArguments: [isXtoY ? pool.tokenYType : pool.tokenXType],
            arguments: [isXtoY ? receive_b : receive_a],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([inputCoin], txb.pure.address(transferToAddress));
            txb.transferObjects([outputCoin], txb.pure.address(transferToAddress));
        }
        else {
            return outputCoin;
        }
    }
    flashSwap(txb, pool, amountX, amountY, inputCoin, transferToAddress) {
        const LowLimitPrice = 4295048016;
        const [receive_a, receive_b, flash_receipt] = txb.moveCall({
            target: `${this.sdk.PackageId}::trade::flash_loan`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                txb.object(pool.objectId),
                txb.pure.u64(amountX),
                txb.pure.u64(amountY),
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        txb.moveCall({
            target: `0x2::balance::destroy_zero`,
            arguments: [receive_a],
            typeArguments: [pool.tokenXType],
        });
        const zeroCoin = txb.moveCall({
            target: `0x2::balance::zero`,
            arguments: [],
            typeArguments: [pool.tokenYType],
        });
        const pay_coin_a = inputCoin;
        const pay_coin_b = zeroCoin;
        txb.moveCall({
            target: `${this.sdk.PackageId}::trade::repay_flash_loan`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                txb.object(pool.objectId),
                flash_receipt,
                pay_coin_a,
                pay_coin_b,
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        const outputCoin = txb.moveCall({
            target: `0x2::coin::from_balance`,
            typeArguments: [],
            arguments: [receive_b],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([outputCoin], txb.pure.address(transferToAddress));
        }
        else {
            return outputCoin;
        }
    }
    removeLiquidity(txb, pool, positionId, liquidity, min_amount_x, min_amount_y, transferToAddress) {
        const [removeLpCoinA, removeLpCoinB] = txb.moveCall({
            target: `${this.sdk.PackageId}::liquidity::remove_liquidity`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                txb.object(pool.objectId),
                (0, common_1.txnArgument)(positionId, txb),
                typeof liquidity === 'bigint' ? txb.pure.u128(liquidity) : liquidity,
                txb.pure.u64(min_amount_x),
                txb.pure.u64(min_amount_y),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([removeLpCoinA, removeLpCoinB], txb.pure.address(transferToAddress));
        }
        else {
            return { removeLpCoinA, removeLpCoinB };
        }
    }
    async addLiquidity(txb, pool, position, coinX, coinY, min_amount_x, min_amount_y, transferToAddress) {
        const [coinA, coinB] = txb.moveCall({
            target: `${this.sdk.PackageId}::liquidity::add_liquidity`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                txb.object(pool.objectId),
                // txb.object("0x06b1701f4a188877281b43b26cc3f96e9d0f9a0cd3aac8d06c914f1ebaa5846a"),
                (0, common_1.txnArgument)(position, txb),
                (0, common_1.txnArgument)(coinX, txb),
                (0, common_1.txnArgument)(coinY, txb),
                txb.pure.u64(min_amount_x),
                txb.pure.u64(min_amount_y),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([coinA, coinB], txb.pure.address(transferToAddress));
        }
        else {
            return { coinA, coinB };
        }
        // const devInspectResult = await this.sdk.rpcClient.devInspectTransaction({
        //     Transaction: txb,
        //     sender: "0xeae88ca35ce291f0a1c807451e0d9712e7c61758a8f1fbf1dd23d9646b275847",
        // });
        // console.log(32242, devInspectResult);
    }
    async addLiquiditySingleSided(txb, pool, position, inputCoin, min_amount_x, min_amount_y, isXtoY, transferToAddress, limitSqrtPrice) {
        const LowLimitPrice = BigInt('4295048017');
        const HighLimitPrice = BigInt('79226673515401279992447579050');
        if (!limitSqrtPrice) {
            limitSqrtPrice = isXtoY ? LowLimitPrice : HighLimitPrice;
        }
        const [depositAmount] = txb.moveCall({
            target: '0x2::coin::value',
            arguments: [inputCoin],
            typeArguments: [isXtoY ? pool.tokenXType : pool.tokenYType],
        });
        const [swapAmount, remainingA] = txb.moveCall({
            target: `${this.sdk.PackageId}::trade::get_optimal_swap_amount_for_single_sided_liquidity`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                txb.object(pool.objectId),
                depositAmount,
                (0, common_1.txnArgument)(position, txb),
                txb.pure.u128(limitSqrtPrice),
                txb.pure.bool(isXtoY),
                txb.pure.u64(20),
            ],
        });
        const [swapCoin] = txb.splitCoins(inputCoin, [swapAmount]);
        const outputCoin = this.swap(txb, pool, swapAmount, swapCoin, isXtoY, null, limitSqrtPrice);
        const [coinAOut, coinBOut] = txb.moveCall({
            target: `${this.sdk.PackageId}::liquidity::add_liquidity`,
            typeArguments: [pool.tokenXType, pool.tokenYType],
            arguments: [
                txb.object(pool.objectId),
                // txb.object("0x06b1701f4a188877281b43b26cc3f96e9d0f9a0cd3aac8d06c914f1ebaa5846a"),
                (0, common_1.txnArgument)(position, txb),
                isXtoY ? inputCoin : outputCoin,
                isXtoY ? outputCoin : inputCoin,
                txb.pure.u64(min_amount_x),
                txb.pure.u64(min_amount_y),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                txb.object(this.sdk.contractConst.versionId),
            ],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([coinAOut, coinBOut], txb.pure.address(transferToAddress));
            txb.transferObjects([swapCoin], txb.pure.address(transferToAddress));
        }
        else {
            return { coinAOut, coinBOut, swapCoin };
        }
        // const devInspectResult = await this.sdk.rpcClient.devInspectTransaction({
        //     Transaction: txb,
        //     sender: "0xeae88ca35ce291f0a1c807451e0d9712e7c61758a8f1fbf1dd23d9646b275847",
        // });
        // console.log(32242, devInspectResult);
    }
    collectFee(txb, pool, positionId, transferToAddress) {
        const [feeCoinA, feeCoinB] = txb.moveCall({
            target: `${this.sdk.PackageId}::collect::fee`,
            arguments: [
                txb.object(pool.objectId),
                (0, common_1.txnArgument)(positionId, txb),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                txb.object(this.sdk.contractConst.versionId),
            ],
            typeArguments: [pool.tokenXType, pool.tokenYType],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([feeCoinA, feeCoinB], txb.pure.address(transferToAddress));
        }
        else {
            return { feeCoinA, feeCoinB };
        }
    }
    collectReward(txb, pool, positionId, rewardCoinType, transferToAddress) {
        const [rewardCoin] = txb.moveCall({
            target: `${this.sdk.PackageId}::collect::reward`,
            arguments: [
                txb.object(pool.objectId),
                (0, common_1.txnArgument)(positionId, txb),
                txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                txb.object(this.sdk.contractConst.versionId),
            ],
            typeArguments: [pool.tokenXType, pool.tokenYType, rewardCoinType],
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects([rewardCoin], txb.pure.address(transferToAddress));
        }
        else {
            return rewardCoin;
        }
    }
    collectAllRewards(txb, pool, rewarders, positionId, transferToAddress) {
        const rewardCoins = [];
        rewarders.map((item) => {
            const rewardCoinType = item.coin_type;
            const rewardCoin = this.collectReward(txb, pool, positionId, rewardCoinType);
            rewardCoins.push(rewardCoin);
        });
        if (Boolean(transferToAddress)) {
            txb.transferObjects(rewardCoins, txb.pure.address(transferToAddress));
        }
        else {
            return rewardCoins;
        }
    }
    async collectAllPoolsRewards(userAddress, pools) {
        if (!userAddress) {
            throw new Error('sender is required');
        }
        const objects = await (0, poolUtils_1.fetchUserObjectsByPkg)(this.sdk.rpcClient, this.sdk.contractConst.publishedAt, userAddress);
        const positions = objects.filter((obj) => obj.type === `${this.sdk.PackageId}::position::Position`);
        return this.fetchRewardsAndFee(positions, pools, userAddress);
    }
    async fetchRewardsAndFee(positions, pools, address) {
        const txb = new transactions_1.Transaction();
        positions.map((position) => {
            const positionData = position.fields;
            const pos_id = positionData.id.id;
            const pool_id = positionData.pool_id;
            const pool = pools.find((pool) => pool.poolId === pool_id);
            const rewarders = pool.rewarders;
            const rewardCoins = [];
            if (rewarders?.length > 0) {
                rewarders.map((item) => {
                    const rewardCoin = txb.moveCall({
                        target: `${this.sdk.PackageId}::collect::reward`,
                        arguments: [
                            txb.object(pool_id),
                            (0, common_1.txnArgument)(pos_id, txb),
                            txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                            txb.object(this.sdk.contractConst.versionId),
                        ],
                        typeArguments: [pool.tokenXType, pool.tokenYType, item.coin_type],
                    });
                    rewardCoins.push(rewardCoin);
                });
                txb.transferObjects(rewardCoins, txb.pure.address(address));
            }
            const [feeCoinA, feeCoinB] = txb.moveCall({
                target: `${this.sdk.PackageId}::collect::fee`,
                arguments: [
                    txb.object(pool_id),
                    (0, common_1.txnArgument)(pos_id, txb),
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                    txb.object(this.sdk.contractConst.versionId),
                ],
                typeArguments: [pool.tokenXType, pool.tokenYType],
            });
            txb.transferObjects([feeCoinA, feeCoinB], txb.pure.address(address));
        });
        return txb;
    }
    async migratevSuiPosition(vSuiPositionId, range, txb, transferToAddress) {
        try {
            const oldPoolId = '0x22e7b3c2d6671d208efb36a32a0a72528e60f9dd33fc71df07ea0ae3df011144';
            const newPoolId = '0xf1b6a7534027b83e9093bec35d66224daa75ea221d555c79b499f88c93ea58a9';
            const typeA = '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT';
            const typeB = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
            const positionTypes = [typeA, typeB];
            const oldPoolParams = {
                objectId: oldPoolId,
                tokenXType: typeA,
                tokenYType: typeB,
            };
            var { feeCoinA, feeCoinB } = this.collectFee(txb, oldPoolParams, vSuiPositionId);
            var vSuiRewardCoin = this.collectReward(txb, oldPoolParams, vSuiPositionId, typeA);
            const oldLiquidity = txb.moveCall({
                target: `${this.sdk.PackageId}::position::liquidity`,
                arguments: [(0, common_1.txnArgument)(vSuiPositionId, txb)],
            });
            let { removeLpCoinA, removeLpCoinB } = this.removeLiquidity(txb, oldPoolParams, vSuiPositionId, oldLiquidity, BigInt(0), BigInt(0));
            txb.mergeCoins(removeLpCoinA, [feeCoinA, vSuiRewardCoin]);
            txb.mergeCoins(removeLpCoinB, [feeCoinB]);
            const mmtV3PoolId = newPoolId;
            const CetusPoolId = '0x6c545e78638c8c1db7a48b282bb8ca79da107993fcb185f75cedc1f5adb2f535';
            let isV3Reverse = false;
            let isCetusSwap = true;
            let isCetusReverse = false;
            let mmtV3Pool = {
                token_x_type: isV3Reverse ? positionTypes[1] : positionTypes[0],
                token_y_type: isV3Reverse ? positionTypes[0] : positionTypes[1],
            };
            let { tokenXSwap, tokenYSwap } = isCetusSwap
                ? {
                    tokenXSwap: isCetusReverse ? positionTypes[1] : positionTypes[0],
                    tokenYSwap: isCetusReverse ? positionTypes[0] : positionTypes[1],
                }
                : {
                    tokenXSwap: mmtV3Pool.token_x_type,
                    tokenYSwap: mmtV3Pool.token_y_type,
                };
            let upperRange = 1 * (1 + range / 100);
            let lowerRange = 1 * (1 - range / 100);
            let upperScalling = tickMath_1.TickMath.priceToSqrtPriceX64(new decimal_js_1.default(upperRange), 9, 9);
            let lowerScalling = tickMath_1.TickMath.priceToSqrtPriceX64(new decimal_js_1.default(lowerRange), 9, 9);
            let [upperSqrtPrice, lowerSqrtPrice] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::utils::get_position_bounds`,
                typeArguments: [mmtV3Pool.token_x_type, mmtV3Pool.token_y_type],
                arguments: [
                    txb.object(newPoolId),
                    txb.pure.u128(BigInt(lowerScalling.toString())),
                    txb.pure.u128(BigInt(upperScalling.toString())),
                ],
            });
            const [refundCoinA, refundCoinB, swapCoinA, swapCoinB, swapAmt, pos] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::migrate::fix_add_lp_residual_vsui`,
                typeArguments: [mmtV3Pool.token_x_type, mmtV3Pool.token_y_type],
                arguments: [
                    lowerSqrtPrice,
                    upperSqrtPrice,
                    removeLpCoinA,
                    removeLpCoinB,
                    txb.object(newPoolId),
                    txb.object(CetusPoolId),
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                    txb.object(this.sdk.contractConst.versionId),
                ],
            });
            let { resCoinA, resCoinB } = (0, poolUtils_1.handleMmtCetusSwap)(swapCoinA, swapCoinB, swapAmt, tokenXSwap, tokenYSwap, isCetusReverse, isCetusSwap, isV3Reverse, CetusPoolId, mmtV3PoolId, txb);
            const [refundCoinA1, refundCoinB1] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::migrate::add_final_lp`,
                typeArguments: [mmtV3Pool.token_x_type, mmtV3Pool.token_y_type],
                arguments: [
                    resCoinA,
                    resCoinB,
                    txb.object(newPoolId),
                    pos,
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                    txb.object(this.sdk.contractConst.versionId),
                ],
            });
            txb.mergeCoins(refundCoinA, [refundCoinA1]);
            txb.mergeCoins(refundCoinB, [refundCoinB1]);
            txb.transferObjects([refundCoinA], txb.pure.address(transferToAddress));
            txb.transferObjects([refundCoinB], txb.pure.address(transferToAddress));
            txb.transferObjects([pos], txb.pure.address(transferToAddress));
        }
        catch (error) {
            console.error(error);
        }
    }
    async getAllPools(headers) {
        const pools = await (0, poolUtils_1.fetchAllPoolsApi)(this.sdk.baseUrl, headers);
        this.validatePoolsId(pools.map((pool) => pool.poolId));
        return pools;
    }
    async getPool(poolId, headers) {
        const pool = await (0, poolUtils_1.fetchPoolApi)(this.sdk.baseUrl, poolId, headers);
        this.validatePoolsId([poolId]);
        return pool;
    }
    async validatePoolsId(poolIds) {
        const resp = await this.sdk.rpcClient.multiGetObjects({
            ids: poolIds,
            options: { showType: true },
        });
        if (!resp || resp.length === 0) {
            throw new Error(`Cannot get pools objects [${poolIds}]`);
        }
        for (const poolData of resp) {
            const pooltype = poolData?.data?.type;
            if (!pooltype) {
                throw new Error(`Cannot get pool object [${poolIds}]`);
            }
            const { address, module, name } = (0, utils_1.parseStructTag)(pooltype);
            if (address !== this.sdk.PackageId || module !== 'pool' || name !== 'Pool') {
                throw new Error(`Invalid pool type: expect: {${this.sdk.PackageId} :: pool :: Pool}, got: {${address} :: ${module} :: ${name}`);
            }
        }
    }
    async getAllTokens(headers) {
        const tokens = await (0, poolUtils_1.fetchAllTokenApi)(this.sdk.baseUrl, headers);
        return tokens;
    }
    async getToken(tokenId, headers) {
        const token = await (0, poolUtils_1.fetchTokenApi)(this.sdk.baseUrl, tokenId, headers);
        return token;
    }
    async fetchAllTickLiquidities(poolId, headers) {
        let offset = 0;
        const limit = 1000; // maximum limit
        let hasNextPage = true;
        let allTickLiquidities = [];
        while (hasNextPage) {
            const response = await (0, poolUtils_1.fetchTickLiquidityApi)('https://api-service-1094519046338.us-west1.run.app/', poolId, limit, offset);
            allTickLiquidities = [...allTickLiquidities, ...response.tickData];
            hasNextPage = response.hasNextPage;
            offset += limit;
        }
        return allTickLiquidities;
    }
    async fetchTickLiquiditity(poolId, offset, limit, headers) {
        const response = await (0, poolUtils_1.fetchTickLiquidityApi)('https://api-service-1094519046338.us-west1.run.app/', poolId, limit, offset);
        return response;
    }
    async getRewardersApy(poolId, headers) {
        const rewarders = await (0, poolUtils_1.fetchRewardersApy)(this.sdk.baseUrl, poolId, headers);
        return rewarders;
    }
    estPositionAPRWithDeltaMethod(currentTickIndex, lowerTickIndex, upperTickIndex, currentSqrtPriceX64, poolLiquidity, decimalsA, decimalsB, feeRate, amountAStr, amountBStr, swapVolumeStr, coinAPriceStr, coinBPriceStr, poolRewarders) {
        const rewarderApr = [];
        const amountA = new decimal_js_1.default(amountAStr);
        const amountB = new decimal_js_1.default(amountBStr);
        const swapVolume = new decimal_js_1.default(swapVolumeStr);
        const coinAPrice = new decimal_js_1.default(coinAPriceStr);
        const coinBPrice = new decimal_js_1.default(coinBPriceStr);
        const lowerSqrtPriceX64 = tickMath_1.TickMath.tickIndexToSqrtPriceX64(lowerTickIndex);
        const upperSqrtPriceX64 = tickMath_1.TickMath.tickIndexToSqrtPriceX64(upperTickIndex);
        const lowerSqrtPriceD = commonMath_1.MathUtil.toX64_Decimal(commonMath_1.MathUtil.fromX64(lowerSqrtPriceX64)).round();
        const upperSqrtPriceD = commonMath_1.MathUtil.toX64_Decimal(commonMath_1.MathUtil.fromX64(upperSqrtPriceX64)).round();
        const currentSqrtPriceD = commonMath_1.MathUtil.toX64_Decimal(commonMath_1.MathUtil.fromX64(currentSqrtPriceX64)).round();
        let deltaLiquidity;
        const liquidityAmount0 = amountA
            .mul(new decimal_js_1.default(10 ** decimalsA))
            .mul(upperSqrtPriceD.mul(lowerSqrtPriceD))
            .div(new decimal_js_1.default(exports.Q_64))
            .div(upperSqrtPriceD.sub(lowerSqrtPriceD))
            .round();
        const liquidityAmount1 = amountB
            .mul(new decimal_js_1.default(10 ** decimalsB))
            .mul(new decimal_js_1.default(exports.Q_64))
            .div(upperSqrtPriceD.sub(lowerSqrtPriceD))
            .round();
        if (currentTickIndex < lowerTickIndex) {
            deltaLiquidity = liquidityAmount0;
        }
        else if (currentTickIndex > upperTickIndex) {
            deltaLiquidity = liquidityAmount1;
        }
        else {
            deltaLiquidity = decimal_js_1.default.min(liquidityAmount0, liquidityAmount1);
        }
        const deltaY = deltaLiquidity
            .mul(currentSqrtPriceD.sub(lowerSqrtPriceD))
            .div(new decimal_js_1.default(exports.Q_64));
        const deltaX = deltaLiquidity
            .mul(upperSqrtPriceD.sub(currentSqrtPriceD))
            .div(currentSqrtPriceD.mul(upperSqrtPriceD))
            .mul(new decimal_js_1.default(exports.Q_64));
        const posValidTVL = deltaX
            .div(new decimal_js_1.default(10 ** decimalsA))
            .mul(coinAPrice)
            .add(deltaY.div(new decimal_js_1.default(10 ** decimalsB).mul(coinBPrice)));
        const feeAPR = deltaLiquidity.eq(new decimal_js_1.default(0))
            ? new decimal_js_1.default(0)
            : new decimal_js_1.default(feeRate)
                .mul(swapVolume)
                .mul(new decimal_js_1.default(deltaLiquidity.toString()).div(new decimal_js_1.default(poolLiquidity.toString()).add(new decimal_js_1.default(deltaLiquidity.toString()))))
                .div(posValidTVL)
                .mul(new decimal_js_1.default(365));
        poolRewarders?.map((item) => {
            if (item.hasEnded)
                return;
            const poolRewardsFlowRateD = new decimal_js_1.default(item.flowRate)
                .div(new decimal_js_1.default('18446744073709551616'))
                .mul(86400);
            const posRewarderPrice = new decimal_js_1.default(item.rewardsPrice);
            const rewarderDecimals = item.rewardsDecimal;
            const posRewarderAPR = poolRewardsFlowRateD
                .div(new decimal_js_1.default(10 ** rewarderDecimals))
                .mul(posRewarderPrice)
                .mul(new decimal_js_1.default(deltaLiquidity.toString()).div(new decimal_js_1.default(poolLiquidity.toString()).add(new decimal_js_1.default(deltaLiquidity.toString()))))
                .div(posValidTVL)
                .mul(new decimal_js_1.default(36500));
            rewarderApr.push({
                rewarderApr: posRewarderAPR,
                coinType: item.coinType,
            });
        });
        return {
            feeAPR,
            rewarderApr,
        };
    }
    calculatePoolValidTVL(amountA, amountB, decimalsA, decimalsB, coinAPrice, coinBPrice) {
        const poolValidAmountA = new decimal_js_1.default(amountA.toString()).div(new decimal_js_1.default(10 ** decimalsA));
        const poolValidAmountB = new decimal_js_1.default(amountB.toString()).div(new decimal_js_1.default(10 ** decimalsB));
        const TVL = poolValidAmountA.mul(coinAPrice).add(poolValidAmountB.mul(coinBPrice));
        return TVL;
    }
    async getRewardsAPY(pool) {
        try {
            const rewarders = pool?.rewarders;
            const tokens = await this.getAllTokens();
            const tokenA = tokens.find((token) => token.coinType === pool?.tokenXType);
            const tokenB = tokens.find((token) => token.coinType === pool?.tokenYType);
            const lower_price = (pool.isStable ? 0.999 : 0.75) *
                tickMath_1.TickMath.sqrtPriceX64ToPrice(new bn_js_1.default(pool?.currentSqrtPrice), tokenA?.decimals, tokenB?.decimals).toNumber();
            const upper_price = (pool.isStable ? 1.001 : 1.25) *
                tickMath_1.TickMath.sqrtPriceX64ToPrice(new bn_js_1.default(pool?.currentSqrtPrice), tokenA?.decimals, tokenB?.decimals).toNumber();
            // console.log(Math.floor((0.9 * Number(pool?.liquidity))).toString(), pool?.current_sqrt_price, TickMath.priceToSqrtPriceX64(new Decimal(lower_price), tokenA?.decimals, tokenB?.decimals).toString(), TickMath.priceToSqrtPriceX64(new Decimal(upper_price), tokenA?.decimals, tokenB?.decimals).toString(),)
            const pool_lower_tick_index = (0, tickMath_1.convertI32ToSigned)(tickMath_1.TickMath.priceToTickIndexWithTickSpacing(new decimal_js_1.default(lower_price), tokenA?.decimals, tokenB?.decimals, pool?.tickSpacing));
            const pool_upper_tick_index = (0, tickMath_1.convertI32ToSigned)(tickMath_1.TickMath.priceToTickIndexWithTickSpacing(new decimal_js_1.default(upper_price), tokenA?.decimals, tokenB?.decimals, pool?.tickSpacing));
            // const { coinXAmount: amountA, coinYAmount: amountB } = getCoinXYForLiquidity(new Decimal(0.1 * Number(pool?.liquidity)), new Decimal(pool?.token_x_reserve), new Decimal(pool?.token_y_reserve), new Decimal(pool?.liquidity))
            const { coinAmountA, coinAmountB } = (0, poolUtils_1.estLiquidityAndcoinAmountFromOneAmounts)(pool_lower_tick_index, pool_upper_tick_index, new bn_js_1.default((1 * 10 ** tokenA.decimals).toString()), true, false, 0.01, new bn_js_1.default(pool?.currentSqrtPrice));
            const swapVolume = pool?.volume24h ?? '0';
            if (!tokenA || !tokenB) {
                throw new Error('Token not found');
            }
            const rewardsArr = rewarders?.map((rewarder) => {
                const coinType = rewarder.coin_type;
                const token = tokens.find((token) => token.coinType === coinType);
                console.log(token.coinType, token.price);
                return {
                    rewardsAmount: Number(rewarder.reward_amount),
                    rewardsPrice: token?.price,
                    rewardsDecimal: token?.decimals,
                    coinType: coinType,
                    hasEnded: rewarder.hasEnded,
                    flowRate: rewarder.flow_rate,
                };
            });
            const aprData = this.estPositionAPRWithDeltaMethod((0, tickMath_1.convertI32ToSigned)(Number(pool.currentTickIndex)), pool_lower_tick_index, pool_upper_tick_index, new bn_js_1.default(pool.currentSqrtPrice), new bn_js_1.default(pool.liquidity), tokenA?.decimals, tokenB?.decimals, Number(pool?.lpFeesPercent), (coinAmountA.toNumber() / 10 ** tokenA.decimals).toString(), (coinAmountB.toNumber() / 10 ** tokenB.decimals).toString(), swapVolume, tokenA?.price, tokenB?.price, rewardsArr ?? []);
            return aprData;
        }
        catch (e) {
            console.error('Error getting rewards apy.');
            console.error(e);
        }
    }
}
exports.PoolModule = PoolModule;
