import { MmtSDK } from '../src';
import { ClmmConsts } from '../src/types';
import { describe, it, expect } from '@jest/globals';
import { Config } from '../src/config';
import { SuiClient } from '@mysten/sui/client';

describe('MmtSDK', () => {
  it('MmtSDK NEW mainnet positive', async () => {
    const network = 'mainnet';
    const sdk = MmtSDK.NEW({
      network: network,
    });
    expect(sdk.PackageId).toEqual(Config.getDefaultClmmParams(network).packageId);
    expect(sdk.BaseUrl).toEqual(Config.getDefaultMmtApiUrl(network));
  });

  it('MmtSDK NEW testnet positive', async () => {
    const network = 'testnet';
    const sdk = MmtSDK.NEW({
      network: network,
    });
    expect(sdk.PackageId).toEqual(Config.getDefaultClmmParams(network).packageId);
    expect(sdk.BaseUrl).toEqual(Config.getDefaultMmtApiUrl(network));
  });

  it('MmtSDK NEW custom positive', async () => {
    const network = 'custom';
    const contractConst: ClmmConsts = {
      packageId: '0x..',
      publishedAt: '0x..',
      aclId: '0x..',
      adminCapId: '0x..',
      slippageCheckPackageId: '0x..',
      globalConfigId: '0x..',
      versionId: '0x..',
    };
    const mmtApiUrl = 'https://testnet.mmtapi.com';
    const suiClientUrl = 'https://fullnode.testnet.sui.io:443';
    const sdk = MmtSDK.NEW({
      network: network,
      contractConst: contractConst,
      mmtApiUrl: mmtApiUrl,
      suiClientUrl: suiClientUrl,
    });
    expect(sdk.PackageId).toEqual(contractConst.packageId);
    expect(sdk.BaseUrl).toEqual(mmtApiUrl);
    expect(sdk.contractConst.globalConfigId).toEqual(contractConst.globalConfigId);
  });

  it('should throw an error if network is custom and contractConst is missing', () => {
    expect(() => MmtSDK.NEW({ network: 'custom' })).toThrowError(
      'missing contractConst for custom network',
    );
  });

  it('MmtSDK constructor mainnet positive', async () => {
    const network = 'mainnet';
    const suiClientUrl = 'https://fullnode.testnet.sui.io:443';
    const sdk = new MmtSDK(suiClientUrl);
    expect(sdk.PackageId).toEqual(Config.getDefaultClmmParams(network).packageId);
    expect(sdk.BaseUrl).toEqual(Config.getDefaultMmtApiUrl(network));
  });

  it('Pass client positive', async () => {
    const network = 'testnet';
    const suiClientUrl = 'https://fullnode.testnet.sui.io:443';
    const sdk = MmtSDK.NEW({
      network: network,
      client: new SuiClient({ url: suiClientUrl }),
    });
    expect(sdk.PackageId).toEqual(Config.getDefaultClmmParams(network).packageId);
    expect(sdk.BaseUrl).toEqual(Config.getDefaultMmtApiUrl(network));
  });

  it('Pass client customHeaders', async () => {
    const network = 'testnet';
    const customHeaders = {
      'x-custom-token': 'test-token',
      'cf-bypass': 'true',
    };
    const sdk = MmtSDK.NEW({
      network: network,
      customHeaders: customHeaders,
    });
    expect(sdk.PackageId).toEqual(Config.getDefaultClmmParams(network).packageId);
    expect(sdk.BaseUrl).toEqual(Config.getDefaultMmtApiUrl(network));
    expect(sdk.customHeaders).toEqual(customHeaders);
  });

  it('should use sdk.customHeaders if headers not passed', async () => {
    const network = 'testnet';
    const customHeaders = { 'x-custom-header': 'customHeaders-test-header' };
    const headers = {
      'x-custom-header': 'headers-test-header',
      'x-custom-token': 'test-token',
      'cf-bypass': 'true',
    };
    const mergeHeaders = { ...customHeaders, ...headers };

    const sdk = MmtSDK.NEW({
      network: network,
      customHeaders: customHeaders,
    });
    const poolModule = sdk.Pool;

    const mockFn = jest.spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi');
    jest.spyOn(poolModule as any, 'getAllTokens').mockResolvedValue([]);
    jest.spyOn(poolModule as any, 'calcRewardApr').mockResolvedValue({ total: 0 });
    mockFn.mockResolvedValue([]);

    await poolModule.getAllPools(headers, false);
    expect(mockFn).toHaveBeenCalledWith(sdk.baseUrl, mergeHeaders);
  });

  it('no custom header specified', async () => {
    const network = 'testnet';
    const headers = {
      'x-custom-header': 'headers-test-header',
      'x-custom-token': 'test-token',
      'cf-bypass': 'true',
    };
    const sdk = MmtSDK.NEW({
      network: network,
    });
    const poolModule = sdk.Pool;

    const mockFn = jest.spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi');
    jest.spyOn(poolModule as any, 'getAllTokens').mockResolvedValue([]);
    jest.spyOn(poolModule as any, 'calcRewardApr').mockResolvedValue({ total: 0 });
    mockFn.mockResolvedValue([]);

    await poolModule.getAllPools(headers, false);
    expect(mockFn).toHaveBeenCalledWith(sdk.baseUrl, headers);
  });

  it('Pass client negative', async () => {
    const suiClientUrl = '    ';
    expect(() =>
      MmtSDK.NEW({
        suiClientUrl: suiClientUrl,
      }),
    ).toThrow('Either suiClientUrl or client must be provided');
  });
});
