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

  it('Pass client negative', async () => {
    const suiClientUrl = '';
    await expect(async () => {
      new MmtSDK(suiClientUrl);
    }).rejects.toThrowError('Either suiClientUrl or client must be provided');

    const undefinedUrl = undefined;
    await expect(async () => {
      new MmtSDK(undefinedUrl);
    }).rejects.toThrowError('Either suiClientUrl or client must be provided');

    const emptyUrl = '   ';
    await expect(async () => {
      new MmtSDK(emptyUrl);
    }).rejects.toThrowError('Either suiClientUrl or client must be provided');
  });
});
