import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { getFullnodeUrl } from '@mysten/sui/client';

export const client = new OKXDexClient({
  apiKey: 'b40936ac-7b91-41b5-9937-4041e69d83ec',
  secretKey: '240F4DFD510993D5B872CD26FFA56E02',
  apiPassphrase: 'WFwFuZPYzW54L8.',
  projectId: 'f4941862514deb1d92f4a130da200ead',
  sui: {
    privateKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
    walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000000',
    connection: {
      rpcUrl: getFullnodeUrl('mainnet'),
    },
  },
});
export async function main() {
  // const tokens = await client.dex.getTokens('784');
  const liquidity = await client.dex.getLiquidity('784');
  console.log('liquidity:', liquidity);
}

main()
  .then(() => console.log('Close position successfully'))
  .catch((error) => console.error('Close position failed:', error));
