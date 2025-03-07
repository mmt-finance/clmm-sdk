"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappedCetusPool = exports.mappedMmtV3Pool = exports.handleMmtCetusSwap = exports.fetchUserObjectsByPkg = void 0;
exports.fetchAllPoolsApi = fetchAllPoolsApi;
exports.fetchPoolApi = fetchPoolApi;
exports.fetchAllTokenApi = fetchAllTokenApi;
exports.fetchTokenApi = fetchTokenApi;
exports.fetchTickLiquidityApi = fetchTickLiquidityApi;
exports.fetchRewardersApy = fetchRewardersApy;
exports.getCoinAmountFromLiquidity = getCoinAmountFromLiquidity;
exports.getCoinXYForLiquidity = getCoinXYForLiquidity;
exports.estimateLiquidityForCoinA = estimateLiquidityForCoinA;
exports.estimateLiquidityForCoinB = estimateLiquidityForCoinB;
exports.estLiquidityAndcoinAmountFromOneAmounts = estLiquidityAndcoinAmountFromOneAmounts;
const decimal_js_1 = __importDefault(require("decimal.js"));
const commonMath_1 = require("./math/commonMath");
const bn_js_1 = __importDefault(require("bn.js"));
const tickMath_1 = require("./math/tickMath");
const constants_1 = require("./constants");
const utils_1 = require("@mysten/sui/utils");
const sdk_1 = require("../sdk");
async function fetchAllPoolsApi(baseUrl, headers) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
        method: 'GET',
        headers: mergedHeaders,
        body: null,
    };
    const response = await fetch(`${baseUrl}/pools/v3`, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
}
async function fetchPoolApi(baseUrl, poolId, headers) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
        method: 'GET',
        headers: mergedHeaders,
        body: null,
    };
    const response = await fetch(`${baseUrl}/pools/v3/${poolId}`, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
}
async function fetchAllTokenApi(baseUrl, headers) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
        method: 'GET',
        headers: mergedHeaders,
        body: null,
    };
    const response = await fetch(`${baseUrl}/tokens`, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
}
async function fetchTokenApi(baseUrl, tokenid, headers) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
        method: 'GET',
        headers: mergedHeaders,
        body: null,
    };
    const response = await fetch(`${baseUrl}/tokens/${tokenid}`, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
}
async function fetchTickLiquidityApi(baseUrl, poolId, limit, offset) {
    const headers = {
        'Content-Type': 'application/json',
    };
    const method = 'GET';
    const options = {
        method,
        headers,
        body: null,
    };
    const response = await fetch(`${baseUrl}/tickLiquidity/${poolId}`, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
}
async function fetchRewardersApy(baseUrl, poolId, headers) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
        method: 'GET',
        headers: mergedHeaders,
        body: null,
    };
    const response = await fetch(`${baseUrl}/rewarders-apy/${poolId}`, options);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    const responseText = await response.text();
    if (!responseText) {
        return [];
    }
    const responseData = JSON.parse(responseText);
    return responseData;
}
function getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, roundUp) {
    const liq = new decimal_js_1.default(liquidity.toString());
    const curSqrtPriceStr = new decimal_js_1.default(curSqrtPrice.toString());
    const lowerPriceStr = new decimal_js_1.default(lowerSqrtPrice.toString());
    const upperPriceStr = new decimal_js_1.default(upperSqrtPrice.toString());
    let coinA;
    let coinB;
    if (curSqrtPrice.lt(lowerSqrtPrice)) {
        coinA = commonMath_1.MathUtil.toX64_Decimal(liq)
            .mul(upperPriceStr.sub(lowerPriceStr))
            .div(lowerPriceStr.mul(upperPriceStr));
        coinB = new decimal_js_1.default(0);
    }
    else if (curSqrtPrice.lt(upperSqrtPrice)) {
        coinA = commonMath_1.MathUtil.toX64_Decimal(liq)
            .mul(upperPriceStr.sub(curSqrtPriceStr))
            .div(curSqrtPriceStr.mul(upperPriceStr));
        coinB = commonMath_1.MathUtil.fromX64_Decimal(liq.mul(curSqrtPriceStr.sub(lowerPriceStr)));
    }
    else {
        coinA = new decimal_js_1.default(0);
        coinB = commonMath_1.MathUtil.fromX64_Decimal(liq.mul(upperPriceStr.sub(lowerPriceStr)));
    }
    if (roundUp) {
        return {
            coinA: new bn_js_1.default(coinA.ceil().toString()),
            coinB: new bn_js_1.default(coinB.ceil().toString()),
        };
    }
    return {
        coinA: new bn_js_1.default(coinA.floor().toString()),
        coinB: new bn_js_1.default(coinB.floor().toString()),
    };
}
function getCoinXYForLiquidity(liquidity, reserveInSize, reserveOutSize, lpSuply) {
    if (liquidity.lessThanOrEqualTo(0)) {
        throw new Error("liquidity can't be equal or less than zero");
    }
    if (reserveInSize.lessThanOrEqualTo(0) || reserveOutSize.lessThanOrEqualTo(0)) {
        throw new Error('reserveInSize or reserveOutSize can not be equal or less than zero');
    }
    // const sqrtSupply = reserveInSize.mul(reserveOutSize).sqrt()
    const sqrtSupply = lpSuply;
    const coinXAmount = liquidity.div(sqrtSupply).mul(reserveInSize);
    const coinYAmount = liquidity.div(sqrtSupply).mul(reserveOutSize);
    return {
        coinXAmount,
        coinYAmount,
    };
}
function estimateLiquidityForCoinA(sqrtPriceX, sqrtPriceY, coinAmount) {
    const lowerSqrtPriceX64 = bn_js_1.default.min(sqrtPriceX, sqrtPriceY);
    const upperSqrtPriceX64 = bn_js_1.default.max(sqrtPriceX, sqrtPriceY);
    const num = commonMath_1.MathUtil.fromX64_BN(coinAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64));
    const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
    return num.div(dem);
}
function estimateLiquidityForCoinB(sqrtPriceX, sqrtPriceY, coinAmount) {
    const lowerSqrtPriceX64 = bn_js_1.default.min(sqrtPriceX, sqrtPriceY);
    const upperSqrtPriceX64 = bn_js_1.default.max(sqrtPriceX, sqrtPriceY);
    const delta = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
    return coinAmount.shln(64).div(delta);
}
function estLiquidityAndcoinAmountFromOneAmounts(lowerTick, upperTick, coinAmount, iscoinA, roundUp, slippage, curSqrtPrice) {
    const currentTick = (0, tickMath_1.convertI32ToSigned)(tickMath_1.TickMath.sqrtPriceX64ToTickIndex(curSqrtPrice));
    const lowerSqrtPrice = tickMath_1.TickMath.tickIndexToSqrtPriceX64(lowerTick);
    const upperSqrtPrice = tickMath_1.TickMath.tickIndexToSqrtPriceX64(upperTick);
    let liquidity;
    if (currentTick < lowerTick) {
        if (!iscoinA) {
            throw new Error('lower tick cannot calculate liquidity by coinB');
        }
        liquidity = estimateLiquidityForCoinA(lowerSqrtPrice, upperSqrtPrice, coinAmount);
    }
    else if (currentTick > upperTick) {
        if (iscoinA) {
            throw new Error('upper tick cannot calculate liquidity by coinA');
        }
        liquidity = estimateLiquidityForCoinB(upperSqrtPrice, lowerSqrtPrice, coinAmount);
    }
    else if (iscoinA) {
        liquidity = estimateLiquidityForCoinA(curSqrtPrice, upperSqrtPrice, coinAmount);
    }
    else {
        liquidity = estimateLiquidityForCoinB(curSqrtPrice, lowerSqrtPrice, coinAmount);
    }
    const coinAmounts = getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, roundUp);
    const tokenLimitA = roundUp
        ? new decimal_js_1.default(coinAmounts.coinA.toString()).mul(1 + slippage).toString()
        : new decimal_js_1.default(coinAmounts.coinA.toString()).mul(1 - slippage).toString();
    const tokenLimitB = roundUp
        ? new decimal_js_1.default(coinAmounts.coinB.toString()).mul(1 + slippage).toString()
        : new decimal_js_1.default(coinAmounts.coinB.toString()).mul(1 - slippage).toString();
    return {
        coinAmountA: new bn_js_1.default(coinAmounts.coinA),
        coinAmountB: new bn_js_1.default(coinAmounts.coinB),
        tokenMaxA: roundUp
            ? new bn_js_1.default(decimal_js_1.default.ceil(tokenLimitA).toString())
            : new bn_js_1.default(decimal_js_1.default.floor(tokenLimitA).toString()),
        tokenMaxB: roundUp
            ? new bn_js_1.default(decimal_js_1.default.ceil(tokenLimitB).toString())
            : new bn_js_1.default(decimal_js_1.default.floor(tokenLimitB).toString()),
        liquidityAmount: liquidity,
        fix_amount_a: iscoinA,
    };
}
const fetchUserObjectsByPkg = async (client, packageId, address) => {
    try {
        let cursor = null;
        let hasNextPage = true;
        let data = [];
        while (hasNextPage) {
            const response = await client?.getOwnedObjects({
                owner: address,
                cursor: cursor,
                filter: {
                    Package: packageId,
                },
                options: {
                    showContent: true,
                },
            });
            if (!response) {
                return [];
            }
            data = [...data, ...response.data.map((d) => d?.data?.content)];
            hasNextPage = response.hasNextPage;
            cursor = response.nextCursor;
        }
        return data;
    }
    catch (error) {
        console.error('Error fetching owned objects:', error);
        throw error;
    }
};
exports.fetchUserObjectsByPkg = fetchUserObjectsByPkg;
const handleMmtCetusSwap = (swapCoinA, swapCoinB, swapAmt, typeX, typeY, isCetusReverse, isCetusSwap, isV3Reverse, cetusPoolId, mmtPoolId, txb) => {
    const sdk = sdk_1.MmtSDK.NEW({ network: 'mainnet' });
    if (isCetusSwap) {
        if (isCetusReverse) {
            let [resCoinB, resCoinA] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::adapters::cetus_adapter`,
                typeArguments: [typeX, typeY],
                arguments: [
                    swapCoinB,
                    swapCoinA,
                    swapAmt,
                    txb.object(cetusPoolId),
                    txb.object(constants_1.ModuleConstants.CETUS_GLOBAL_CONFIG_ID),
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                ],
            });
            return { resCoinA, resCoinB };
        }
        else {
            let [resCoinA, resCoinB] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::adapters::cetus_adapter`,
                typeArguments: [typeX, typeY],
                arguments: [
                    swapCoinA,
                    swapCoinB,
                    swapAmt,
                    txb.object(cetusPoolId),
                    txb.object(constants_1.ModuleConstants.CETUS_GLOBAL_CONFIG_ID),
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                ],
            });
            return { resCoinA, resCoinB };
        }
    }
    else {
        if (isV3Reverse) {
            let [resCoinB, resCoinA] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::adapters::mmt_adapter`,
                typeArguments: [typeX, typeY],
                arguments: [
                    swapCoinB,
                    swapCoinA,
                    swapAmt,
                    txb.object(mmtPoolId),
                    txb.object(sdk.contractConst.versionId),
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                ],
            });
            return { resCoinA, resCoinB };
        }
        else {
            let [resCoinA, resCoinB] = txb.moveCall({
                target: `${constants_1.ModuleConstants.migrationPackageId}::adapters::mmt_adapter`,
                typeArguments: [typeX, typeY],
                arguments: [
                    swapCoinA,
                    swapCoinB,
                    swapAmt,
                    txb.object(mmtPoolId),
                    txb.object(sdk.contractConst.versionId),
                    txb.object((0, utils_1.normalizeSuiObjectId)('0x6')),
                ],
            });
            return { resCoinA, resCoinB };
        }
    }
};
exports.handleMmtCetusSwap = handleMmtCetusSwap;
// mmtV2 pool id -> MmtV3 pool id
exports.mappedMmtV3Pool = {
    '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305': {
        id: '0x367e02acb99632e18db69c3e93d89d21eb721e1d1fcebc0f6853667337450acc',
        isReverse: true,
        lowerScale: '13043692734520023948',
        upperScale: '22591727467072087864',
    },
    '0xd0086b7713e0487bbf5bb4a1e30a000794e570590a6041155cdbebee3cb1cb77': {
        id: '0xc83d3c409375cb05fbe6a7f30a4f0da4aa75bda3352a08d2285216ef1a470267',
        isReverse: false,
        lowerScale: '18353810417316872927',
        upperScale: '18583564898576848757',
    },
    '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716': {
        id: '0xf1b6a7534027b83e9093bec35d66224daa75ea221d555c79b499f88c93ea58a9',
        isReverse: false,
        lowerScale: '18353810417316872927',
        upperScale: '18583564898576848757',
    },
    '0x43ca1a6de20d7feabcaa460ac3798a6fdc754d3a83b49dff93221612c1370dcc': {
        id: '0x6b9b2ff862d54ed619e4d59ba8cc509d9a6f7ba1c113a301280cca6e66181d04',
        isReverse: false,
        lowerScale: '13043692734520023948',
        upperScale: '22591727467072087864',
    },
};
// mmtV2 pool id -> Cetus pool id
exports.mappedCetusPool = {
    '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305': {
        id: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
        isCetus: true,
        isCetusReverse: false,
    },
    '0xd0086b7713e0487bbf5bb4a1e30a000794e570590a6041155cdbebee3cb1cb77': {
        id: '0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782e4d2ca20',
        isCetus: true,
        isCetusReverse: true,
    },
    '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716': {
        id: '0x6c545e78638c8c1db7a48b282bb8ca79da107993fcb185f75cedc1f5adb2f535',
        isCetus: true,
        isCetusReverse: false,
    },
    '0x43ca1a6de20d7feabcaa460ac3798a6fdc754d3a83b49dff93221612c1370dcc': {
        id: '0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9060eb8945eeb82b3e2df',
        isCetus: true,
        isCetusReverse: false,
    },
};
