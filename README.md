# BOTChain Signature Inspector & On-Chain Verifier (`bot signatureverify`)

A specialized cryptographic signature inspection and on-chain verification tool built for **BOTChain Testnet** (Chain ID: 968).

Supports **EIP-191** (`personal_sign` / raw 32-byte hashes) and **EIP-712** typed structured data.

* 📄 **Official Whitepaper**: Read the full cryptographic protocol specification in [WHITEPAPER.md](WHITEPAPER.md).
* 🌐 **Contract Address**: [`0x9BE360D16bd9c46E46Ba014795eF893f000Bda68`](https://scan.bohr.life/address/0x9BE360D16bd9c46E46Ba014795eF893f000Bda68)
* 🐙 **GitHub Repository**: [https://github.com/webtrovert0x/signatureverify](https://github.com/webtrovert0x/signatureverify)

---

## 🛠️ Features

1. **Standard Signature Inspector**:
   - Inspect message strings (EIP-191) or raw 32-byte hashes.
   - Decomposes signatures into `r`, `s`, `v`, byte length, and malleability status.
   - Recovered signer vs. Expected signer matching.
   - "Sign with Connected Wallet" helper for instant testing.
   - On-chain verification calling `verifySignature` or `verifyMessage` on `BOTSignatureVerify.sol`.

2. **Advanced EIP-712 Mode**:
   - Specify Domain Name, Version, Chain ID (968), and Verifying Contract.
   - Typed data definitions & message JSON with built-in presets (ERC-2612 Permit, Ether Mail).
   - Real-time calculation of Domain Separator, Struct Hash, and EIP-712 Digest.
   - "Sign with Connected Wallet" helper (`signTypedData`).
   - On-chain verification calling `verifyTypedData` on `BOTSignatureVerify.sol`.

3. **Smart Contract (`BOTSignatureVerify.sol`)**:
   - Every verification executes a **state-changing on-chain transaction** on BOTChain Testnet.
   - OpenZeppelin `ECDSA` (`tryRecover`) handles malformed, invalid-length, and malleable signatures safely without reverting.
   - Records request IDs, block numbers, callers, digests, signers, and statuses in persistent on-chain audit records.

4. **Clean, Flat Interface**:
   - Standard neutral colors (slate/zinc/blue/green), zero glossy textures or color gradients.

---

## ⚙️ Configuration & `.env`

Your [.env](file:///.env) file is pre-configured for BOTChain Testnet:

```ini
# Private key for deploying BOTSignatureVerify.sol to BOTChain Testnet
PRIVATE_KEY=

# Reown Project ID (WalletConnect)
REOWN_ID=

# Network Settings
BOTCHAIN_RPC_URL=https://rpc.bohr.life
BOTCHAIN_CHAIN_ID=968
BOTCHAIN_EXPLORER_URL=https://scan.bohr.life/
```

> **Security Note**: This application uses `REOWN_ID` directly and never asks users for seed phrases or private keys.

---

## 🚀 Quick Start

### 1. Run Smart Contract Tests
```bash
npx hardhat test
```

### 2. Deploy `BOTSignatureVerify.sol` to BOTChain Testnet
Once you fill in `PRIVATE_KEY` with testnet BOT tokens in `.env`:
```bash
npm run deploy
```
This automatically updates `src/config/contractAddress.json` with the deployed address. You can also paste any deployed address directly in the UI.

### 3. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

