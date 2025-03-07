import { TransactionArgument, Transaction } from '@mysten/sui/transactions';
import { CoinStruct, SuiClient } from '@mysten/sui/client';
declare const getSuiCoin: (amount: bigint | TransactionArgument, txb: Transaction) => TransactionArgument;
declare const mergeCoins: (coinObjects: Array<string | TransactionArgument>, txb: Transaction) => TransactionArgument | undefined;
declare const getCoinValue: (coinType: string, coinObject: string | TransactionArgument, txb: Transaction) => TransactionArgument;
declare const getExactCoinByAmount: (coinType: string, coins: {
    objectId: string;
    balance: bigint;
}[], amount: bigint, txb: Transaction) => {
    $kind: "NestedResult";
    NestedResult: [number, number];
};
declare const getAllUserCoins: ({ address, type, suiClient, }: {
    type: string;
    address: string;
    suiClient: SuiClient;
}) => Promise<any[]>;
declare const mergeAllUserCoins: (coinType: string, signerAddress: string, suiClient: SuiClient) => Promise<Transaction>;
declare const mergeAllCoinsWithoutFetch: (coins: CoinStruct[], coinType: string, txb: Transaction) => void;
declare const getCoinsGreaterThanAmount: (amount: bigint, coins: {
    objectId: string;
    balance: bigint;
}[]) => string[];
export { getSuiCoin, mergeCoins, getCoinValue, getExactCoinByAmount, mergeAllUserCoins, mergeAllCoinsWithoutFetch, getAllUserCoins, getCoinsGreaterThanAmount, };
