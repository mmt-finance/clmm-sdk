import { SuiClient, CoinStruct, PaginatedCoins } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { ModuleConstants } from '../src/utils/constants';
import { SuiAddress } from '../src/types';
import { isSuiStructEqual } from './utils';

export interface CoinTransferIntention {
  recipient: SuiAddress;
  coinType: string;
  amount: string;
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

export async function buildCoinTransferTxb(
  txb: Transaction,
  client: SuiClient,
  intention: CoinTransferIntention,
  sender: SuiAddress,
) {
  if (isSuiStructEqual(intention.coinType, ModuleConstants.suiCoinType)) {
    return buildSuiCoinTransferTxb(txb, intention);
  }
  return buildOtherCoinTransferTxb(txb, client, intention, sender);
}

export function buildSuiCoinTransferTxb(txb: Transaction, intention: CoinTransferIntention) {
  const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(intention.amount)]);
  return { coin };
}

export async function buildOtherCoinTransferTxb(
  txb: Transaction,
  client: SuiClient,
  intention: CoinTransferIntention,
  sender: SuiAddress,
) {
  const objs = await getAllCoins(client, sender, intention.coinType);
  if (objs.length === 0) {
    throw new Error('No valid coin found to send');
  }
  const totalBal = objs.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  if (totalBal < BigInt(intention.amount)) {
    throw new Error('Not enough balance');
  }
  const primary = txb.object(objs[0]?.coinObjectId ?? '');
  if (objs.length > 1) {
    txb.mergeCoins(
      primary,
      objs.slice(1).map((obj) => txb.object(obj.coinObjectId)),
    );
  }
  const [coin] = txb.splitCoins(primary, [txb.pure.u64(intention.amount)]);
  return { coin };
}
