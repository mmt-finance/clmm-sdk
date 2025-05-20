import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import ALL_POOL_DATA from './__test_data__/all-pools.json';

describe('RouteModule', () => {
  let sdk: MmtSDK;
  let routeModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    routeModule = sdk.Route;
    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi')
      .mockResolvedValueOnce(ALL_POOL_DATA);
  });

  it('positive SUI/USDC', async () => {
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const amount = BigInt(Math.floor(2 * 10 ** 9));
    const route = await routeModule.fetchRoute(tokenXType, tokenYType, amount);
    expect(route).toBeDefined();
    expect(route.output).toBeGreaterThan(0n);
  }, 30000);

  it('positive SUI/USDC pass pools and tokens', async () => {
    const pools = await sdk.Pool.getAllPools();
    const tokens = await sdk.Pool.getAllTokens();
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const tokenX = tokens.filter((token) => token.coinType === tokenXType);
    const amount = BigInt(Math.floor(2 * 10 ** tokenX[0].decimals));
    const route = await routeModule.fetchRoute(tokenXType, tokenYType, amount, pools, tokens);
    expect(route).toBeDefined();
  }, 30000);

  it('positive SUI/USDC pass pools and tokens - Input amount is too large', async () => {
    const pools = await sdk.Pool.getAllPools();
    const tokens = await sdk.Pool.getAllTokens();
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const tokenX = tokens.filter((token) => token.coinType === tokenXType);
    const amount = BigInt(Math.floor(2000000000000 * 10 ** tokenX[0].decimals));

    const route = await routeModule.fetchRoute(tokenXType, tokenYType, amount, pools, tokens);
    expect(route).toBeDefined();
  }, 30000);

  it('positive SUI/USDC pass pools and tokens - Input amount is too small', async () => {
    const pools = await sdk.Pool.getAllPools();
    const tokens = await sdk.Pool.getAllTokens();
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const tokenX = tokens.filter((token) => token.coinType === tokenXType);
    const amount = BigInt(Math.floor(0.0000002 * 10 ** tokenX[0].decimals));
    const route = await routeModule.fetchRoute(tokenXType, tokenYType, amount, pools, tokens);
    expect(route.output).toEqual(0n);
  }, 30000);

  it('negative SUI/USDC pass wrong tokens', async () => {
    const pools = await sdk.Pool.getAllPools();
    const tokens = await sdk.Pool.getAllTokens();
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const finallyTokens = tokens.filter((token) => token.coinType !== tokenXType);
    const tokenX = tokens.filter((token) => token.coinType === tokenXType);
    const amount = BigInt(Math.floor(2 * 10 ** tokenX[0].decimals));

    await expect(
      routeModule.fetchRoute(tokenXType, tokenYType, amount, pools, finallyTokens),
    ).rejects.toThrow('No pools or source token found');
  }, 30000);

  it('positive SUI/USDC pass empty pools or tokens', async () => {
    const pools = await sdk.Pool.getAllPools();
    const tokens = await sdk.Pool.getAllTokens();
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    const tokenX = tokens.filter((token) => token.coinType === tokenXType);
    const amount = BigInt(Math.floor(2 * 10 ** tokenX[0].decimals));

    expect(await routeModule.fetchRoute(tokenXType, tokenYType, amount, [], tokens)).toBeDefined();

    expect(await routeModule.fetchRoute(tokenXType, tokenYType, amount, pools, [])).toBeDefined();
  }, 30000);

  it('positive ALPHA/WAL', async () => {
    const tokenXType =
      '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA';
    const tokenYType =
      '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';
    const amount = BigInt(Math.floor(2 * 10 ** 9));
    const route = await routeModule.fetchRoute(tokenXType, tokenYType, amount);
    expect(route).toBeDefined();
  }, 30000);

  it('positive STSUI/WAL', async () => {
    const tokenXType =
      '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI';
    const tokenYType =
      '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';
    const amount = BigInt(Math.floor(2 * 10 ** 9));
    const route = await routeModule.fetchRoute(tokenXType, tokenYType, amount);
    expect(route).toBeDefined();
  }, 30000);

  it('negative', async () => {
    const tokenXType = '0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS';
    const tokenYType =
      '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN';
    const amount = BigInt(Math.floor(2 * 10 ** 6));

    expect(await routeModule.fetchRoute(tokenXType, tokenYType, amount)).toEqual(null);
  }, 30000);
});
