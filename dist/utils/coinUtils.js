"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoinsGreaterThanAmount = exports.getAllUserCoins = exports.mergeAllCoinsWithoutFetch = exports.mergeAllUserCoins = exports.getExactCoinByAmount = exports.getCoinValue = exports.mergeCoins = exports.getSuiCoin = void 0;
const transactions_1 = require("@mysten/sui/transactions");
const constants_1 = require("../utils/constants");
const getSuiCoin = (amount, txb) => {
    const inputCoinAmount = typeof amount === 'bigint' ? txb.pure.u64(amount) : amount;
    const [coin] = txb.splitCoins(txb.gas, [inputCoinAmount]);
    return coin;
};
exports.getSuiCoin = getSuiCoin;
const mergeCoins = (coinObjects, txb) => {
    if (coinObjects.length == 1) {
        return typeof coinObjects[0] == 'string' ? txb.object(coinObjects[0]) : coinObjects[0];
    }
    let firstCoin = typeof coinObjects[0] == 'string' ? txb.object(coinObjects[0]) : coinObjects[0];
    txb.mergeCoins(
    // @ts-ignore
    firstCoin, coinObjects.slice(1).map((coin) => (typeof coin == 'string' ? txb.object(coin) : coin)));
    return firstCoin;
};
exports.mergeCoins = mergeCoins;
const getCoinValue = (coinType, coinObject, txb) => {
    const inputCoinObject = typeof coinObject == 'string' ? txb.object(coinObject) : coinObject;
    let [value] = txb.moveCall({
        target: `0x2::coin::value`,
        typeArguments: [coinType],
        // @ts-ignore
        arguments: [inputCoinObject],
    });
    return value;
};
exports.getCoinValue = getCoinValue;
const getExactCoinByAmount = (coinType, coins, amount, txb) => {
    if (coinType === constants_1.ModuleConstants.suiCoinType) {
        const [coinA] = txb.splitCoins(txb.gas, [txb.pure.u64(amount)]);
        return coinA;
    }
    else {
        const coinsX = getCoinsGreaterThanAmount(amount, coins);
        if (coinsX.length > 1) {
            txb.mergeCoins(txb.object(coinsX[0]), coinsX.slice(1).map((coin) => txb.object(coin)));
        }
        const [coinA] = txb.splitCoins(txb.object(coinsX[0]), [txb.pure.u64(amount)]);
        return coinA;
    }
};
exports.getExactCoinByAmount = getExactCoinByAmount;
const getAllUserCoins = async ({ address, type, suiClient, }) => {
    let cursor;
    let coins = [];
    let iter = 0;
    do {
        try {
            const res = await suiClient.getCoins({
                owner: address,
                coinType: type,
                cursor: cursor,
                limit: 50,
            });
            coins = coins.concat(res.data);
            cursor = res.nextCursor;
            if (!res.hasNextPage || iter === 8) {
                cursor = null;
            }
        }
        catch (error) {
            console.log(error);
            cursor = null;
        }
        iter++;
    } while (cursor !== null);
    return coins;
};
exports.getAllUserCoins = getAllUserCoins;
const mergeAllUserCoins = async (coinType, signerAddress, suiClient) => {
    try {
        const coins = await getAllUserCoins({
            address: signerAddress,
            type: coinType,
            suiClient,
        });
        let totalBalance = BigInt(0);
        coins.forEach((coin) => {
            totalBalance += BigInt(coin.balance);
        });
        const txb = new transactions_1.Transaction();
        if (coinType === constants_1.ModuleConstants.suiCoinType) {
            totalBalance = totalBalance - BigInt('1000');
            txb.splitCoins(txb.gas, [txb.pure.u64(totalBalance)]);
        }
        const coinObjectsIds = coins.map((coin) => coin.coinObjectId);
        if (coins.length > 1) {
            txb.mergeCoins(txb.object(coinObjectsIds[0]), coinObjectsIds.slice(1).map((coin) => txb.object(coin)));
        }
        return txb;
    }
    catch (error) {
        console.log(error);
    }
};
exports.mergeAllUserCoins = mergeAllUserCoins;
const mergeAllCoinsWithoutFetch = (coins, coinType, txb) => {
    let totalBalance = BigInt(0);
    coins.forEach((coin) => {
        totalBalance += BigInt(coin.balance);
    });
    if (coinType === constants_1.ModuleConstants.suiCoinType) {
        totalBalance = totalBalance - BigInt('1000');
        txb.splitCoins(txb.gas, [txb.pure.u64(totalBalance)]);
    }
    const coinObjectsIds = coins.map((coin) => coin.coinObjectId);
    if (coins.length > 1) {
        txb.mergeCoins(txb.object(coinObjectsIds[0]), coinObjectsIds.slice(1).map((coin) => txb.object(coin)));
    }
};
exports.mergeAllCoinsWithoutFetch = mergeAllCoinsWithoutFetch;
const getCoinsGreaterThanAmount = (amount, coins) => {
    const coinsWithBalance = [];
    let collectedAmount = BigInt(0);
    for (const coin of coins) {
        if (collectedAmount < amount && !coinsWithBalance.includes(coin.objectId)) {
            coinsWithBalance.push(coin.objectId);
            collectedAmount = collectedAmount + coin.balance;
        }
        if (coin.balance === BigInt(0) && !coinsWithBalance.includes(coin.objectId))
            coinsWithBalance.push(coin.objectId);
    }
    if (collectedAmount >= amount) {
        return coinsWithBalance;
    }
    else {
        throw new Error('Insufficient balance');
    }
};
exports.getCoinsGreaterThanAmount = getCoinsGreaterThanAmount;
