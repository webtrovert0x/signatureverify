# BOT SignatureVerify Protocol Whitepaper

**An On-Chain Cryptographic Inspection and Audit Protocol for EIP-191 & EIP-712 Signatures on BOTChain**

*Version 1.0 — November 2026*  
*Protocol Repository: [https://github.com/webtrovert0x/signatureverify](https://github.com/webtrovert0x/signatureverify)*  
*Contract Instance (BOTChain Testnet): [`0x9BE360D16bd9c46E46Ba014795eF893f000Bda68`](https://scan.bohr.life/address/0x9BE360D16bd9c46E46Ba014795eF893f000Bda68)*

---

## Abstract

Cryptographic signatures are the bedrock of transaction authorization, intent verification, and off-chain meta-transactions in EVM-compatible blockchains. However, traditional off-chain signature verification remains opaque to the ledger: verifying signatures purely on client runtimes introduces verification divergence, lacks an auditable trail, and offers no verifiable proof of execution to external contracts. Furthermore, malformed or malleable ECDSA signatures (specifically high-$s$ malleability) frequently trigger unhandled transaction reverts or replay vulnerabilities in naive implementations.

**BOT SignatureVerify** introduces a non-reverting, state-changing on-chain inspection protocol deployed on **BOTChain Testnet (Chain ID: 968)**. The protocol performs native cryptographic verification for both **EIP-191** (`personal_sign` and raw 32-byte hash digests) and **EIP-712** typed structured data. By persisting every verification request into an immutable on-chain audit register with distinct `requestId` sequences, callers receive provable, on-chain attestation of signature validity, recovered signer identity, and structural compliance without risking denial-of-service from invalid or malformed signature payloads.

---

## 1. Introduction & Background

### 1.1 The Dominance of Off-Chain Signing
As decentralized ecosystems scale, off-chain cryptographic signatures have become ubiquitous:
* **Gasless authorizations and meta-transactions** (EIP-2771 / ERC-4337)
* **Token allowance delegations** via ERC-2612 Permit
* **Decentralized exchange limit orders** (0x, Seaport, CoW Swap)
* **Decentralized identity (DID) and web logins** via SIWE (EIP-4361)

Signatures allow users to commit to arbitrary state transitions without paying gas fees until settlement.

### 1.2 The Problem: Verification Opacity and Runtime Divergence
Despite their widespread usage, common implementations suffer from three critical shortcomings:

1. **Lack of Immutable Audit Trails**: When a signature is verified client-side or within transient view functions, no immutable record is created on-chain. Disputes regarding whether an authorization existed at block height $H$ cannot be independently settled without re-evaluating external logs.
2. **Signature Malleability Vulnerabilities**: ECDSA signatures $(r, s, v)$ on the elliptic curve `secp256k1` are inherently malleable: for any valid signature $(r, s)$, the tuple $(r, -s \pmod n)$ is also valid for the same message hash. Naive contracts that fail to enforce lower half-order constraints risk replay attacks or signature tampering.
3. **Fragile Exception Handling**: Naive calls to the EVM `ecrecover` precompile or reverting validation libraries crash caller transactions when fed malformed or invalid-length signatures. This prevents contracts from safely recording failed validation attempts for forensic or rate-limiting purposes.

### 1.3 The BOT SignatureVerify Objective
BOT SignatureVerify bridges this gap by providing an on-chain cryptographic notary that:
- Natively verifies EIP-191 and EIP-712 signatures inside the EVM.
- Safely traps malformed signatures, invalid lengths, and malleable high-$s$ values without reverting.
- Persists all validation requests and status metrics into state-changing transaction receipts with deterministic `requestId` indices.
- Never requires or handles sensitive user secrets (seed phrases or private keys).

---

## 2. Cryptographic Foundations

### 2.1 ECDSA over `secp256k1`
Ethereum and BOTChain utilize the Elliptic Curve Digital Signature Algorithm (ECDSA) over the curve:
$$y^2 = x^3 + 7 \pmod p$$

A signature consists of three parameters:
* $r \in [1, n-1]$: The $x$-coordinate of an ephemeral curve point $R = k \cdot G \pmod n$.
* $s \in [1, n-1]$: The signature scalar computed as $s = k^{-1}(z + r \cdot d_A) \pmod n$, where $z$ is the message digest and $d_A$ is the private key.
* $v \in \{27, 28\}$ (or $yParity \in \{0, 1\}$): The recovery identifier allowing deterministic public key extraction without transmitting the full public key.

### 2.2 EIP-191 Architecture
To prevent signed data intended for off-chain protocols from being interpreted as valid EVM transactions, EIP-191 introduces a structured prefix:
$$\text{Digest} = \text{keccak256}\left(\texttt{0x19} \parallel \text{version} \parallel \text{version-specific data} \parallel \text{data}\right)$$

For `personal_sign` (version `0x45`, `E`), this becomes:
$$\text{Digest} = \text{keccak256}\left(\texttt{"\\x19Ethereum Signed Message:\\n"} \parallel \text{len}(\text{message}) \parallel \text{message}\right)$$

BOT SignatureVerify supports both arbitrary-length UTF-8 message payloads and pre-computed 32-byte digests.

### 2.3 EIP-712 Structured Data Hashing
EIP-712 prevents phishing and transaction misinterpretation by presenting human-readable typed structures. The digest computation follows:
$$\text{Digest}_{\text{EIP-712}} = \text{keccak256}\left(\texttt{"\\x19\\x01"} \parallel \text{domainSeparator} \parallel \text{hashStruct}(\text{message})\right)$$

Where:
* $\text{domainSeparator} = \text{hashStruct}(\text{EIP712Domain})$ binds the signature to a specific application name, version, chain ID, and verifying contract.
* $\text{hashStruct}(s) = \text{keccak256}(\text{typeHash} \parallel \text{encodeData}(s))$ recursively encodes typed struct members.

### 2.4 Malleability Protection (EIP-2 Compliance)
The `secp256k1` curve order $n$ is:
$$n = \texttt{0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141}$$

To eliminate signature malleability, BOT SignatureVerify enforces the strict lower half-order rule:
$$s \le \frac{n}{2} = \texttt{0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0}$$

Signatures exceeding this threshold are flagged as `INVALID_SIGNATURE_S` and recorded as invalid.

---

## 3. Protocol Architecture & System Flow

```
                      +---------------------------------------+
                      |       Client / User Interface         |
                      |   (Reown AppKit + Viem / Wagmi v2)    |
                      +-------------------+-------------------+
                                          |
                        1. Decompose & Validate Format
                        (Length: 65 bytes, r, s, v, Malleability)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        BOTChain Testnet (Chain ID: 968)                           |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                    BOTSignatureVerify.sol Smart Contract                    |  |
|  |                                                                             |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | 2. Execution Entrypoints (State-Changing)                             |  |  |
|  |  |    - verifySignature(bytes32, bytes, address)                         |  |  |
|  |  |    - verifyMessage(bytes, bytes, address)                             |  |  |
|  |  |    - verifyTypedData(bytes32, bytes32, bytes, address)                |  |  |
|  |  +-----------------------------------+-----------------------------------+  |  |
|  |                                      |                                      |  |
|  |                                      v                                      |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | 3. Safe Recovery Pipeline (OpenZeppelin ECDSA.tryRecover)             |  |  |
|  |  |    - Check signature length == 65 bytes                               |  |  |
|  |  |    - Enforce lower s-order (s <= n/2)                                 |  |  |
|  |  |    - Check valid recovery v in {27, 28}                               |  |  |
|  |  |    - Call ecrecover precompile without uncaught reverts               |  |  |
|  |  +-----------------------------------+-----------------------------------+  |  |
|  |                                      |                                      |  |
|  |                                      v                                      |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | 4. Record Storage & Audit Ledger Generation                           |  |  |
|  |  |    - Increment requestId counter                                      |  |  |
|  |  |    - Store VerificationRecord in contract storage                     |  |  |
|  |  |    - Emit SignatureVerified event with full execution metadata        |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Smart Contract Specification (`BOTSignatureVerify.sol`)

### 4.1 Data Types and Enums

```solidity
enum VerificationType {
    RAW_MESSAGE_HASH,     // 0: Direct 32-byte digest
    ETH_SIGNED_MESSAGE,   // 1: EIP-191 personal_sign prefix
    TYPED_DATA_EIP712     // 2: EIP-712 structured typed data
}

enum VerificationStatus {
    VALID,                    // 0: Cryptographically valid & matches expected signer
    SIGNER_MISMATCH,          // 1: Valid ECDSA, but recovered != expectedSigner
    INVALID_SIGNATURE_LENGTH, // 2: Calldata signature length != 65 bytes
    INVALID_SIGNATURE_S,      // 3: High-S malleability detected (s > n/2)
    INVALID_SIGNATURE_V,      // 4: Recovery parameter v not in {27, 28}
    MALFORMED_SIGNATURE       // 5: Precompile returned address(0) or corrupt bytes
}

struct VerificationRecord {
    uint256 requestId;
    uint256 timestamp;
    uint256 blockNumber;
    address caller;
    bytes32 digest;
    address expectedSigner;
    address recoveredSigner;
    bool isValid;
    VerificationType verificationType;
    VerificationStatus status;
    bytes signature;
}
```

### 4.2 State Variables
* `uint256 public nextRequestId`: Monotonically increasing request identifier initialized at `1`.
* `mapping(uint256 => VerificationRecord) public verificationRecords`: Core storage mapping indexed by `requestId`.
* `uint256[] public allRequestIds`: Global ordered register of all executed verification requests.
* `mapping(address => uint256[]) private userRequestIds`: Per-caller indexing for selective history retrieval.

### 4.3 Core Public Interfaces

#### `verifySignature`
```solidity
function verifySignature(
    bytes32 messageHash,
    bytes calldata signature,
    address expectedSigner
) external returns (uint256 requestId, bool isValid, address recoveredSigner);
```
Performs verification for a 32-byte hash digest. If direct recovery does not match `expectedSigner`, the contract tests whether the signature was produced against an Ethereum-prefixed hash (`\x19Ethereum Signed Message:\n32` + `messageHash`), ensuring complete compatibility with varied client libraries.

#### `verifyMessage`
```solidity
function verifyMessage(
    bytes calldata message,
    bytes calldata signature,
    address expectedSigner
) external returns (uint256 requestId, bool isValid, address recoveredSigner);
```
Accepts arbitrary-length message bytes, computes the canonical EIP-191 prefix on-chain, and verifies the resulting signature.

#### `verifyTypedData`
```solidity
function verifyTypedData(
    bytes32 domainSeparator,
    bytes32 structHash,
    bytes calldata signature,
    address expectedSigner
) external returns (uint256 requestId, bool isValid, address recoveredSigner);
```
Verifies EIP-712 typed structured data. Computes:
$$\text{digest} = \text{keccak256}(\texttt{"\\x19\\x01"} \parallel \text{domainSeparator} \parallel \text{structHash})$$
Recovers signer and records the result under `VerificationType.TYPED_DATA_EIP712`.

---

## 5. Security & Threat Model

### 5.1 Private Key and Seed Phrase Isolation
* **Zero Private Key Ingestion**: The client application operates solely as an interface to browser-injected wallets (MetaMask, Rabby, Coinbase Wallet) via standard EIP-1193 RPC channels.
* Seed phrases and raw private keys are never collected, stored, or transmitted over any network interface.

### 5.2 Malleability and Replay Resistance
* Signatures where $s > n/2$ are immediately classified as `INVALID_SIGNATURE_S` and rejected, preventing signature replay attacks in protocols consuming these records.
* EIP-712 domain separators strictly bind signatures to the target `chainId` (`968`) and verifying contract, neutralizing cross-chain replay threats.

### 5.3 Non-Reverting Denial-of-Service Defense
* Traditional contracts revert when `ecrecover` fails or when validation checks abort.
* BOT SignatureVerify utilizes safe recovery via OpenZeppelin's `ECDSA.tryRecover`. Malformed signatures, truncated lengths, and corrupt bytes are recorded on-chain as failed validations, ensuring caller transactions succeed and maintain an auditable security log.

---

## 6. Reference Deployment on BOTChain Testnet

| Parameter | Value |
|---|---|
| **Network** | BOTChain Testnet |
| **Chain ID** | `968` |
| **RPC Endpoint** | `https://rpc.bohr.life` |
| **Native Asset** | `BOT` |
| **Explorer** | `https://scan.bohr.life/` |
| **Deployed Contract** | `0x9BE360D16bd9c46E46Ba014795eF893f000Bda68` |
| **Compiler Version** | Solidity `0.8.24` (optimizer: 200 runs, viaIR, Cancun EVM target) |
| **Audit Status** | Unit tested (100% test pass rate across EIP-191, EIP-712, mismatch, and malformed vectors) |

---

## 7. Frontend User Experience Specification

The companion decentralized application implements a flat, high-contrast, functional design philosophy:
1. **Zero Glossy Gradients**: Strict adherence to flat slate/zinc neutral tones, solid color buttons, and crisp typography to eliminate visual fatigue.
2. **Interactive Wallet Signing**: Test messages and EIP-712 structs can be signed directly with a connected wallet in one click for instant end-to-end verification.
3. **Deconstructed Signature Anatomy**: Instant breakdown of $r$, $s$, $v$, length, and malleability checks.
4. **On-Chain Transaction Receipts**: Direct deep-links to block explorer transaction receipts showing the immutable Request ID and gas consumption.

---

## 8. Conclusion

BOT SignatureVerify establishes a verifiable, immutable, and fail-safe cryptographic notarization layer for BOTChain. By transforming ephemeral off-chain signatures into permanent on-chain audit records while defending against signature malleability and malformed payload panics, the protocol provides developers, contracts, and end users with definitive mathematical assurance for Web3 interactions.

---

*© 2026 BOT SignatureVerify Contributors. Licensed under the MIT License.*
