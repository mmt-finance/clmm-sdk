import { MmtSDK } from '../src';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { executeTxExample } from './example-utils';

export async function main() {
  // Initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';

  const pools = await sdk.Pool.getAllPools(); // Get AllPools detail using sdk

  // Init collectAllPoolsRewards tx
  const tx = await sdk.Pool.collectAllPoolsRewards(senderAddress, pools);

  // Execute transaction
  const resp = await executeTxExample({
    tx,
    sdk,
    execution: { dryRun: true, address: senderAddress },
  });
  console.log(resp);
}

main()
  .then(() => console.log('Claim fee and rewards successfully'))
  .catch((error) => console.error('Claim fee and rewards failed:', error));
