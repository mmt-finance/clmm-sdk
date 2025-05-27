import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const suiClient = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

export const client = new OKXDexClient({
  apiKey: '4445197e-5ac5-4e2b-a069-3c719a68a4f1',
  secretKey: '799576EF0E7DF06BF5880CBFFA5574BA',
  apiPassphrase: 'Ch991213$',
  projectId: 'b22243bcbb0aa211349c9af5d5ee69f0',
  sui: {
    privateKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
    walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000000',
    connection: {
      rpcUrl: getFullnodeUrl('mainnet'),
    },
  },
});

const SUI_CHAIN_ID = '784';

// replace with your own wallet address
const SUI_WALLET_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const TOKENS = {
  SUI: '0x2::sui::SUI',
  USDC: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
} as const;

async function executeSwap() {
  try {
    // First, get token information using a quote
    console.log('Getting token information...');
    const fromTokenAddress = TOKENS.SUI;
    const toTokenAddress = TOKENS.USDC;

    const liquidity = await client.dex.getLiquidity('784');
    console.log('🚀 ~ okx.ts:61 ~ executeSwap ~ liquidity:', liquidity);

    const quote = await client.dex.getQuote({
      chainId: SUI_CHAIN_ID,
      fromTokenAddress,
      toTokenAddress,
      amount: '1000000', // Small amount for quote
      slippage: '0.05',
    });

    const tokenInfo = {
      fromToken: {
        symbol: quote.data[0].fromToken.tokenSymbol,
        decimals: parseInt(quote.data[0].fromToken.decimal),
        price: quote.data[0].fromToken.tokenUnitPrice,
      },
      toToken: {
        symbol: quote.data[0].toToken.tokenSymbol,
        decimals: parseInt(quote.data[0].toToken.decimal),
        price: quote.data[0].toToken.tokenUnitPrice,
      },
    };

    const humanReadableAmount = 0.001; // 0.001 SUI
    const rawAmount = (humanReadableAmount * Math.pow(10, tokenInfo.fromToken.decimals)).toString();

    const swapData = await client.dex.getSwapData({
      chainId: SUI_CHAIN_ID,
      fromTokenAddress,
      toTokenAddress,
      amount: rawAmount,
      slippage: '0.05',
      userWalletAddress: SUI_WALLET_ADDRESS,
    });

    const tx = Transaction.from(swapData.data[0].tx?.data!);

    const devRes = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: SUI_WALLET_ADDRESS,
    });
    console.log('🚀 ~ okx.ts:105 ~ executeSwap ~ devRes:', devRes);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error executing swap:', error.message);
      // API errors include details in the message
      if (error.message.includes('API Error:')) {
        const match = error.message.match(/API Error: (.*)/);
        if (match) console.error('API Error Details:', match[1]);
      }
    }
    throw error;
  }
}

executeSwap();
