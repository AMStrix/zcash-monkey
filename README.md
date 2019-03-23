## zcash-monkey

An interactive console for your zcash node.

**Warning** This is very much a POC, and not intended for mainnet usage. Use at your own risk!

### Features

- check balances
- send funds
- HD t-address derivation and adding to wallet (viewing/xpub only)

### Requires

- OS: tested on macOS and linux
- [nodejs](https://nodejs.org/en/download/) tested with v8.13.8 & v10.13.0
- [yarn](https://yarnpkg.com/en/docs/install) package manager
- access to a [zcash node](https://zcash.readthedocs.io)

### Setup and run

```bash
git clone https://github.com/AMStrix/zcash-monkey.git
cd zcash-monkey
yarn
yarn dev
```
