import { MmtSDK } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { getAllUserCoins, getExactCoinByAmount } from '../src/utils/coinUtils';

export async function main() {
  const sdk = MmtSDK.NEW({
    network: 'testnet', // or 'mainnet'
  });

  const txb = new Transaction();

  try {
    console.log('Creating pool and adding initial liquidity...');
    console.log(`Pool Configuration:`);

    const transferToAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
    const coinXType = '0x2::sui::SUI';
    const coinYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const feeRate = 5000;
    const lowerTick = -443586;
    const upperTick = 443586;
    const sqrtPrice = 1032461480827898941n;

    const xCoins = await getAllUserCoins({
      address: transferToAddress,
      type: coinXType,
      suiClient: sdk.rpcClient,
    });

    const inputCoinX = getExactCoinByAmount(coinXType, xCoins, 100_000_000n, txb);

    const yCoins = await getAllUserCoins({
      address: transferToAddress,
      type: coinYType,
      suiClient: sdk.rpcClient,
    });

    const inputCoinY = getExactCoinByAmount(coinYType, yCoins, 3_160_000n, txb);

    await sdk.Pool.createPoolAndDeposit({
      txb,
      coinXType,
      coinYType,
      feeRate,
      lowerTick,
      upperTick,
      sqrtPrice,
      transferToAddress,
      initialLiquidityX: inputCoinX,
      initialLiquidityY: inputCoinY,
    });

    const res = await sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: transferToAddress,
    });

    if (res.error || res.effects?.status.status !== 'success') {
      throw new Error(`Dry run failed: ${res.error || 'Unknown failure'}`);
    }

    console.log('Pool creation and liquidity deposit transaction built successfully!');
  } catch (error) {
    console.error(error, 'Error creating pool and depositing liquidity:');
  }
}
