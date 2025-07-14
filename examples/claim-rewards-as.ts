import { MmtSDK } from '../src';
import { executeTxExample } from './example-utils';
import { Transaction } from '@mysten/sui/transactions';

const targetCoinType = [
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
  '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
][3];

export async function main() {
  // Initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'mainnet',
  });
  const senderAddress = '0x69549aee762551cba111095374c4c201d5bd4b7b10f3b45b951331fcee942b48';

  const positions = await sdk.Position.getAllUserPositions(senderAddress);
  console.log('\n\n\npositions\n\n\n', positions);

  if (positions.length === 0) {
    console.log('No positions found for this address:', senderAddress);
    return;
  }

  const pool = await sdk.Pool.getPool(positions[0].poolId);

  const txb = new Transaction();

  await sdk.Pool.claimFeeAs({
    txb,
    pool: {
      objectId: pool.poolId,
      tokenXType: pool.tokenXType,
      tokenYType: pool.tokenYType,
    },
    positionId: positions[0].objectId,
    targetCoinType,
    slippage: 1,
    useMvr: false,
    toAddress: senderAddress,
  });

  const resp = await executeTxExample({
    tx: txb,
    sdk,
    execution: { dryRun: true, address: senderAddress },
  });

  console.log('\n\n\nresp\n\n\n', resp);
}

main()
  .then(() => console.log(`\n\n\nClaim fee as ${targetCoinType} successfully`))
  .catch((error) => console.error(`\n\n\nClaim fee as ${targetCoinType} failed:`, error));
