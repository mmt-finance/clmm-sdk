## Examples

A set of typescript scripts are provided to walk through the basic usage of @mmt-finance/clmm-sdk.

### Running an example

Install dependencies

```bash
yarn
```

Run a specific example (E.g. swap.ts)

```bash
yarn scripts examples/swap.ts
```

### Execute transaction

By default, transaction is evaluated in dryRun mode. To execute transaction,
update the script as follows:

```typescript
const mnemonic = ''; // Replace mnemonic here
const signer = Ed25519Keypair.deriveKeypair(mnemonic); // Define the user's mnemonic (should be replaced with an actual mnemonic)
const resp = await executeTxExample({
  tx,
  sdk,
  execution: { dryrun: false, signer: signer },
});
```

### Set network to Mainnet

Configure SDK to run on Mainnet network:

```
const sdk = MmtSDK.NEW({ network: 'mainnet' });
```