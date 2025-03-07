import { TransactionArgument, Transaction } from '@mysten/sui/transactions';
import { CoinStruct, SuiClient } from '@mysten/sui/client';
import { ModuleConstants } from '../utils/constants';

const getSuiCoin = (
  amount: bigint | TransactionArgument,
  txb: Transaction,
): TransactionArgument => {
  const inputCoinAmount = typeof amount === 'bigint' ? txb.pure.u64(amount) : amount;
  const [coin] = txb.splitCoins(txb.gas, [inputCoinAmount]);
  return coin;
};

const mergeCoins = (
  coinObjects: Array<string | TransactionArgument>,
  txb: Transaction,
): TransactionArgument | undefined => {
  if (coinObjects.length == 1) {
    return typeof coinObjects[0] == 'string' ? txb.object(coinObjects[0]) : coinObjects[0];
  }
  let firstCoin = typeof coinObjects[0] == 'string' ? txb.object(coinObjects[0]) : coinObjects[0];
  txb.mergeCoins(
    // @ts-ignore
    firstCoin,
    coinObjects.slice(1).map((coin) => (typeof coin == 'string' ? txb.object(coin) : coin)),
  );
  return firstCoin;
};

const getCoinValue = (
  coinType: string,
  coinObject: string | TransactionArgument,
  txb: Transaction,
): TransactionArgument => {
  const inputCoinObject = typeof coinObject == 'string' ? txb.object(coinObject) : coinObject;
  let [value] = txb.moveCall({
    target: `0x2::coin::value`,
    typeArguments: [coinType],
    // @ts-ignore
    arguments: [inputCoinObject],
  });
  return value;
};

const getExactCoinByAmount = (
  coinType: string,
  coins: { objectId: string; balance: bigint }[],
  amount: bigint,
  txb: Transaction,
) => {
  if (coinType === ModuleConstants.suiCoinType) {
    const [coinA] = txb.splitCoins(txb.gas, [txb.pure.u64(amount)]);
    return coinA;
  } else {
    const coinsX = getCoinsGreaterThanAmount(amount, coins);

    if (coinsX.length > 1) {
      txb.mergeCoins(
        txb.object(coinsX[0]),
        coinsX.slice(1).map((coin) => txb.object(coin)),
      );
    }

    const [coinA] = txb.splitCoins(txb.object(coinsX[0]), [txb.pure.u64(amount)]);
    return coinA;
  }
};

const getAllUserCoins = async ({
  address,
  type,
  suiClient,
}: {
  type: string;
  address: string;
  suiClient: SuiClient;
}) => {
  let cursor: string;

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
    } catch (error) {
      console.log(error);
      cursor = null;
    }
    iter++;
  } while (cursor !== null);

  return coins;
};

const mergeAllUserCoins = async (coinType: string, signerAddress: string, suiClient: SuiClient) => {
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

    const txb = new Transaction();

    if (coinType === ModuleConstants.suiCoinType) {
      totalBalance = totalBalance - BigInt('1000');
      txb.splitCoins(txb.gas, [txb.pure.u64(totalBalance)]);
    }

    const coinObjectsIds = coins.map((coin) => coin.coinObjectId);

    if (coins.length > 1) {
      txb.mergeCoins(
        txb.object(coinObjectsIds[0]),
        coinObjectsIds.slice(1).map((coin) => txb.object(coin)),
      );
    }

    return txb;
  } catch (error) {
    console.log(error);
  }
};

const mergeAllCoinsWithoutFetch = (coins: CoinStruct[], coinType: string, txb: Transaction) => {
  let totalBalance = BigInt(0);
  coins.forEach((coin) => {
    totalBalance += BigInt(coin.balance);
  });

  if (coinType === ModuleConstants.suiCoinType) {
    totalBalance = totalBalance - BigInt('1000');
    txb.splitCoins(txb.gas, [txb.pure.u64(totalBalance)]);
  }

  const coinObjectsIds = coins.map((coin) => coin.coinObjectId);

  if (coins.length > 1) {
    txb.mergeCoins(
      txb.object(coinObjectsIds[0]),
      coinObjectsIds.slice(1).map((coin) => txb.object(coin)),
    );
  }
};

const getCoinsGreaterThanAmount = (
  amount: bigint,
  coins: { objectId: string; balance: bigint }[],
) => {
  const coinsWithBalance: string[] = [];

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
  } else {
    throw new Error('Insufficient balance');
  }
};

export {
  getSuiCoin,
  mergeCoins,
  getCoinValue,
  getExactCoinByAmount,
  mergeAllUserCoins,
  mergeAllCoinsWithoutFetch,
  getAllUserCoins,
  getCoinsGreaterThanAmount,
};
