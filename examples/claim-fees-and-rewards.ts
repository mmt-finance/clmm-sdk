import { MmtSDK } from '../src';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export async function main() {
  // Initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';

  const pools = await sdk.Pool.getAllPools(); // Get AllPools detail using sdk

  const tx = await sdk.Pool.collectAllPoolsRewards(senderAddress, pools); // Init collectAllPoolsRewards tx

  // Execute transaction
  const mnemonic = '';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic); // Define the user's mnemonic (should be replaced with an actual mnemonic)
  const result = await sdk.rpcClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  const responce = await sdk.rpcClient.waitForTransaction({ digest: result.digest });
}

main();
