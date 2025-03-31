import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { DryRunTransactionBlockResponse } from '@mysten/sui/client';
import { fetchUserObjectsByPkg } from '../src/utils/poolUtils';

describe('RouteModule', () => {
  let sdk: MmtSDK;
  let routeModule;
  let poolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    routeModule = sdk.Route;
    poolModule = sdk.Pool;
  });

  it('positive', async () => {
    const tokenXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const tokenYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
    await poolModule.fetchRoute(tokenXType, tokenYType, 2);
  }, 30000);
});
