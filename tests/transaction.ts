import { SuiClient, CoinStruct, PaginatedCoins } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { ModuleConstants } from '../src/utils/constants';
import { SuiAddress } from '../src/types';
import { isSuiStructEqual } from './utils';
import type { TransactionArgument } from '@mysten/sui/src/transactions/Commands';

export class TxHelper {
  static async prepareSplitCoin(
    tx: Transaction,
    client: SuiClient,
    coinType: string,
    amount: string,
    sender: SuiAddress,
  ) {
    if (isSuiStructEqual(coinType, ModuleConstants.suiCoinType)) {
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
      return coin;
    } else {
      const primary = await this.prepareCoin(tx, client, coinType, amount, sender);
      const [coin] = tx.splitCoins(primary, [tx.pure.u64(amount)]);
      return coin;
    }
  }

  static async prepareCoin(
    tx: Transaction,
    client: SuiClient,
    coinType: string,
    amount: string,
    sender: SuiAddress,
  ) {
    if (isSuiStructEqual(coinType, ModuleConstants.suiCoinType)) {
      return tx.gas;
    }
    const objs = await getAllCoins(client, sender, coinType);
    if (objs.length === 0) {
      throw new Error('No valid coin found to send');
    }
    const totalBal = objs.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBal < BigInt(amount)) {
      throw new Error('Not enough balance');
    }
    const primary = tx.object(objs[0]?.coinObjectId ?? '');
    if (objs.length > 1) {
      tx.mergeCoins(
        primary,
        objs.slice(1).map((obj) => tx.object(obj.coinObjectId)),
      );
    }
    return primary;
  }
}

/**
 * Get all owner coins
 * @param client sui client
 * @param owner owner address
 * @param coinType coin type
 * @returns coins
 */
export async function getAllCoins(
  client: SuiClient,
  owner: SuiAddress,
  coinType: string | undefined,
) {
  let hasNext = true;
  let cursor: string | undefined | null;
  const res: CoinStruct[] = [];
  while (hasNext) {
    const currentPage: PaginatedCoins = await client.getCoins({
      owner,
      coinType,
      cursor,
    });
    res.push(...currentPage.data);
    hasNext = currentPage.hasNextPage;
    cursor = currentPage.nextCursor;
  }
  return res;
}
