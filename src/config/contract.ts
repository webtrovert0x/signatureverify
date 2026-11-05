import contractAddressData from './contractAddress.json' with { type: 'json' };

// Default deployed address fallback, can be updated via .env or contractAddress.json
export const CONTRACT_ADDRESS = (contractAddressData?.address || '') as `0x${string}`;

export const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "requestId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "caller", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "expectedSigner", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "recoveredSigner", "type": "address" },
      { "indexed": false, "internalType": "bytes32", "name": "digest", "type": "bytes32" },
      { "indexed": false, "internalType": "bool", "name": "isValid", "type": "bool" },
      { "indexed": false, "internalType": "uint8", "name": "verificationType", "type": "uint8" },
      { "indexed": false, "internalType": "uint8", "name": "status", "type": "uint8" }
    ],
    "name": "SignatureVerified",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "allRequestIds",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "count", "type": "uint256" }
    ],
    "name": "getRecentVerifications",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "requestId", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
          { "internalType": "address", "name": "caller", "type": "address" },
          { "internalType": "bytes32", "name": "digest", "type": "bytes32" },
          { "internalType": "address", "name": "expectedSigner", "type": "address" },
          { "internalType": "address", "name": "recoveredSigner", "type": "address" },
          { "internalType": "bool", "name": "isValid", "type": "bool" },
          { "internalType": "uint8", "name": "verificationType", "type": "uint8" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "internalType": "struct BOTSignatureVerify.VerificationRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalVerifications",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getUserRequestIds",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextRequestId",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes", "name": "message", "type": "bytes" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "address", "name": "expectedSigner", "type": "address" }
    ],
    "name": "verifyMessage",
    "outputs": [
      { "internalType": "uint256", "name": "requestId", "type": "uint256" },
      { "internalType": "bool", "name": "isValid", "type": "bool" },
      { "internalType": "address", "name": "recoveredSigner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "messageHash", "type": "bytes32" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "address", "name": "expectedSigner", "type": "address" }
    ],
    "name": "verifySignature",
    "outputs": [
      { "internalType": "uint256", "name": "requestId", "type": "uint256" },
      { "internalType": "bool", "name": "isValid", "type": "bool" },
      { "internalType": "address", "name": "recoveredSigner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "domainSeparator", "type": "bytes32" },
      { "internalType": "bytes32", "name": "structHash", "type": "bytes32" },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "address", "name": "expectedSigner", "type": "address" }
    ],
    "name": "verifyTypedData",
    "outputs": [
      { "internalType": "uint256", "name": "requestId", "type": "uint256" },
      { "internalType": "bool", "name": "isValid", "type": "bool" },
      { "internalType": "address", "name": "recoveredSigner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
