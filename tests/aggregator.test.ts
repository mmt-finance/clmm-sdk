import { beforeEach, describe } from '@jest/globals';
import { MmtSDK } from '../src';
import { TokenSchema } from '../src/types';

describe('AggregatorModule', () => {
  let sdk: MmtSDK;
  let aggregatorModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    aggregatorModule = sdk.Aggregator;
  });

  it('should fetch all OKX tokens', async () => {
    const mockTokens: TokenSchema[] = [
      {
        coinType: '0x2::sui::SUI',
        name: 'SUI',
        ticker: 'SUI',
        iconUrl: 'https://static.okx.com/cdn/wallet/logo/sui_17700_new.png',
        decimals: 9,
        description: 'Sui native token',
        isVerified: true,
        isMmtWhitelisted: true,
        tokenType: '',
        price: '3.72',
      },
      {
        coinType: '0xdba3::usdc::USDC',
        name: 'USDC',
        ticker: 'USDC',
        iconUrl: 'https://static.okx.com/cdn/web3/currency/token/small/784-0xdba3.png',
        decimals: 6,
        description: 'USD Coin',
        isVerified: false,
        isMmtWhitelisted: true,
        tokenType: '',
        price: '1.00',
      },
    ];

    jest.spyOn(aggregatorModule, 'getAllOkxTokens').mockResolvedValueOnce(mockTokens);

    const tokens = await aggregatorModule.getAllOkxTokens();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBe(2);
    expect(tokens[0].coinType).toBe('0x2::sui::SUI');
  });
});
