export const MainnetConfig = {
  clmm: {
    packageId: '0x9c12f3aa14a449a0a23c066589e269086f021a98939f21158cfacb16d19787c3',
    publishedAt: '0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860',
    aclId: '0xe7f25417d58cd086a64e3daed2ef04d065b606458becce33871f6d3e8b35db9d',
    adminCapId: '0x11d573677fee08613bc4e089252945753445ad710ac3e8e4b61d4f8281907118',
    slippageCheckPackageId: '0x8add2f0f8bc9748687639d7eb59b2172ba09a0172d9e63c029e23a7dbdb6abe6',
    globalConfigId: '0x9889f38f107f5807d34c547828f4a1b4d814450005a4517a58a1ad476458abfc',
    versionId: '0x2375a0b1ec12010aaea3b2545acfa2ad34cfbba03ce4b59f4c39e1e25eed1b2a',
  },
  mmtApiUrl: 'https://api.mmt.finance',
  suiClientUrl: 'https://fullnode.mainnet.sui.io:443',
};

export const TestnetConfig = {
  clmm: {
    packageId: '0xd7c99e1546b1fc87a6489afdc08bcece4ae1340cbd8efd2ab152ad71dea0f0f2',
    publishedAt: '0xd7c99e1546b1fc87a6489afdc08bcece4ae1340cbd8efd2ab152ad71dea0f0f2',
    aclId: '0xb3ffc02f50b866b8b29a3b6005f21d16ad386e33c20d384ee21610ba754ba899',
    adminCapId: '0x6a271f877a36c75e48120af09124fed1ce3464caf3254307f7ded086ff2120c9',
    slippageCheckPackageId: '0xfd6a45c396a90811fd93efaf585cc95c29aecd079c87822893f1e97e3fee8c50',
    globalConfigId: '0x3c4385bf373c7997a953ee548f45188d9f1ca4284ec835467688d8ee276e1af7',
    versionId: '0x83ea3e3e7384efd6b524ff973e4b627cd84d190c45d3f4fd9f5f4fc6c95fd26b',
  },
  mmtApiUrl: 'https://api-dev.mmt.finance',
  suiClientUrl: 'https://fullnode.testnet.sui.io:443',
};
export class Config {
  static getDefaultClmmParams(network: string) {
    if (network === 'testnet') {
      return TestnetConfig.clmm;
    } else {
      return MainnetConfig.clmm;
    }
  }

  static getDefaultMmtApiUrl(network: string) {
    if (network === 'testnet') {
      return TestnetConfig.mmtApiUrl;
    } else {
      return MainnetConfig.mmtApiUrl;
    }
  }

  static getDefaultSuiClientUrl(network: string) {
    if (network === 'testnet') {
      return TestnetConfig.suiClientUrl;
    } else {
      return MainnetConfig.suiClientUrl;
    }
  }
}
