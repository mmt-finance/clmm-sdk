## Introduction

MMT-CLMM-SUI-SDK is the official software development kit (SDK) specifically designed for seamless integration with MMT-CLMM. It provides developers with the necessary tools and resources to easily connect and interact with MMT-CLMM, enabling the development of robust and efficient applications.

## Getting Started
To integrate our SDK into your local project, please follow the example steps provided below.
Please see details in document.
### Prerequisites
  ```sh
  npm i @mmt-finance/mmt-clmm-sdk
  ```

### Setting Up Configuration
Our SDK now includes a default initialization method that allows for quick generation of the MMT SDK configuration. You can utilize the src/sdk NEW method to swiftly initialize the configuration. You have the option to select either 'mainnet' or 'testnet' for the network.
  ```typescript
  import { MmtSDK } from '@mmt-finance/mmt-clmm-sdk'

  const mmtClmmSDK = MmtSDK.NEW({
      network: 'mainnet',
    });
  ```
If you wish to set your own full node URL and simulate address, you can do so as follows:
  ```typescript
  import { MmtSDK } from '@mmt-finance/mmt-clmm-sdk'
    
    const network = 'custom';
    const contractConst : ClmmConsts = {
            packageId: '0x..',
            publishedAt: '0x..',
            aclId: '0x..',
            adminCapId: '0x..',
            slippageCheckPackageId: '0x..',
            globalConfigId: '0x..',
            versionId: '0x..',
        };
    const mmtApiUrl = 'https://...';
    const suiClientUrl = 'https://...';
    const sdk = MmtSDK.NEW({
      network: network,
      contractConst: contractConst,
      mmtApiUrl: mmtApiUrl,
      suiClientUrl: suiClientUrl
    });
  ```

Now, you can start using MMT SDK.