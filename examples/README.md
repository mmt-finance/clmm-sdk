## Examples

These examples show how to build common tasks in Typescript.

### Running an example

These examples use a linked version of the `mmt` package from the main repository. To run a test, first build the
package in the top level directory of this repo.

```bash
  yarn
```

At this point, you can run any of the examples in this directory. For example, to run the `swap` example:

```bash
  npx ts-node examples/swap.ts
```

This will then print out the results of the test accordingly.

### Execute real transactions on the testnet
 Change executeTxExample and set dryrun as false and generate signer
```
const mnemonic = '';
const signer = Ed25519Keypair.deriveKeypair(mnemonic); // Define the user's mnemonic (should be replaced with an actual mnemonic)
const resp = await executeTxExample({
    tx,
    sdk,
    execution: { dryrun: false, signer: signer },
  });
```

### Execute transactions on the mainnet
 Generate mainnet sdk 
```
const sdk = MmtSDK.NEW({
network: 'mainnet',
});
```
