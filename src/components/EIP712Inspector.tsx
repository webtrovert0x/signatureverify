import React, { useState, useEffect } from 'react';
import { useAccount, useSignTypedData, useWriteContract, usePublicClient } from 'wagmi';
import {
  isAddress,
  isHex,
  parseEventLogs,
  hashTypedData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  stringToBytes,
} from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contract';
import { VerificationResultData } from '../types';
import { decomposeSignature, recoverSignerOffChain } from '../utils/signature';
import { PenTool, CheckCircle, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface Props {
  onVerificationComplete: (result: VerificationResultData) => void;
  contractAddress: string;
}

// Preset definitions for fast testing
const PRESETS = {
  permit: {
    domain: {
      name: 'BOT USD',
      version: '1',
      chainId: 968,
      verifyingContract: '0x1111111111111111111111111111111111111111',
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: {
      owner: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
      spender: '0x5555555555555555555555555555555555555555',
      value: '1000000000000000000',
      nonce: 0,
      deadline: 1893456000,
    },
  },
  mail: {
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: 968,
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    },
    types: {
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
      ],
    },
    primaryType: 'Mail',
    message: {
      from: {
        name: 'Alice',
        wallet: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
      },
      to: {
        name: 'Bob',
        wallet: '0x2222222222222222222222222222222222222222',
      },
      contents: 'Hello on BOTChain!',
    },
  },
};

export const EIP712Inspector: React.FC<Props> = ({ onVerificationComplete, contractAddress }) => {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Domain states
  const [domainName, setDomainName] = useState<string>('BOT USD');
  const [domainVersion, setDomainVersion] = useState<string>('1');
  const [domainChainId, setDomainChainId] = useState<number>(968);
  const [domainVerifyingContract, setDomainVerifyingContract] = useState<string>(
    '0x1111111111111111111111111111111111111111'
  );

  // Types & Message
  const [primaryType, setPrimaryType] = useState<string>('Permit');
  const [typesJson, setTypesJson] = useState<string>(
    JSON.stringify(PRESETS.permit.types, null, 2)
  );
  const [messageJson, setMessageJson] = useState<string>(
    JSON.stringify(PRESETS.permit.message, null, 2)
  );

  const [signature, setSignature] = useState<string>('');
  const [expectedSigner, setExpectedSigner] = useState<string>('0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5');

  const [calculatedDigest, setCalculatedDigest] = useState<`0x${string}` | null>(null);
  const [calculatedDomainSeparator, setCalculatedDomainSeparator] = useState<`0x${string}` | null>(null);
  const [calculatedStructHash, setCalculatedStructHash] = useState<`0x${string}` | null>(null);

  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically recalculate hashes whenever inputs change
  useEffect(() => {
    try {
      if (!isAddress(domainVerifyingContract.trim())) return;

      const parsedTypes = JSON.parse(typesJson);
      const parsedMessage = JSON.parse(messageJson);

      const domain = {
        name: domainName,
        version: domainVersion,
        chainId: Number(domainChainId),
        verifyingContract: domainVerifyingContract.trim() as `0x${string}`,
      };

      // Calculate typed data hash using viem
      const digest = hashTypedData({
        domain,
        types: parsedTypes,
        primaryType,
        message: parsedMessage,
      });

      setCalculatedDigest(digest);

      // Compute standard domainSeparator
      const DOMAIN_TYPEHASH = keccak256(
        stringToBytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
      );
      const nameHash = keccak256(stringToBytes(domainName));
      const versionHash = keccak256(stringToBytes(domainVersion));

      const domainSeparator = keccak256(
        encodeAbiParameters(
          parseAbiParameters('bytes32, bytes32, bytes32, uint256, address'),
          [DOMAIN_TYPEHASH, nameHash, versionHash, BigInt(domainChainId), domainVerifyingContract.trim() as `0x${string}`]
        )
      );

      setCalculatedDomainSeparator(domainSeparator);

      // In EIP-712: digest = keccak256("\x19\x01" || domainSeparator || structHash)
      // For on-chain verifyTypedData(domainSeparator, structHash, signature, expectedSigner),
      // we compute structHash such that keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash)) == digest.
      // If primaryType is Permit, we compute the direct structHash:
      if (primaryType === 'Permit' && parsedMessage.owner && parsedMessage.spender) {
        const PERMIT_TYPEHASH = keccak256(
          stringToBytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
        );
        const structHash = keccak256(
          encodeAbiParameters(
            parseAbiParameters('bytes32, address, address, uint256, uint256, uint256'),
            [
              PERMIT_TYPEHASH,
              parsedMessage.owner as `0x${string}`,
              parsedMessage.spender as `0x${string}`,
              BigInt(parsedMessage.value),
              BigInt(parsedMessage.nonce),
              BigInt(parsedMessage.deadline),
            ]
          )
        );
        setCalculatedStructHash(structHash);
      } else {
        // Fallback placeholder structHash
        setCalculatedStructHash(keccak256(stringToBytes(JSON.stringify(parsedMessage))));
      }
    } catch {
      // Ignored during mid-typing of JSON
    }
  }, [domainName, domainVersion, domainChainId, domainVerifyingContract, primaryType, typesJson, messageJson]);

  // Load Preset
  const handleLoadPreset = (key: 'permit' | 'mail') => {
    setErrorMessage(null);
    const preset = PRESETS[key];
    setDomainName(preset.domain.name);
    setDomainVersion(preset.domain.version);
    setDomainChainId(preset.domain.chainId);
    setDomainVerifyingContract(preset.domain.verifyingContract);
    setPrimaryType(preset.primaryType);
    setTypesJson(JSON.stringify(preset.types, null, 2));

    const updatedMessage = { ...preset.message };
    if (key === 'permit' && address) {
      (updatedMessage as any).owner = address;
      setExpectedSigner(address);
    }
    setMessageJson(JSON.stringify(updatedMessage, null, 2));
    setSignature('');
  };

  // Sign with Connected Wallet
  const handleSignTypedData = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first to sign EIP-712 typed data.');
      return;
    }
    setErrorMessage(null);
    setIsSigning(true);
    try {
      const parsedTypes = JSON.parse(typesJson);
      const parsedMessage = JSON.parse(messageJson);

      const domain = {
        name: domainName,
        version: domainVersion,
        chainId: Number(domainChainId),
        verifyingContract: domainVerifyingContract.trim() as `0x${string}`,
      };

      const sig = await signTypedDataAsync({
        domain,
        types: parsedTypes,
        primaryType,
        message: parsedMessage,
      });

      setSignature(sig);
      setExpectedSigner(address);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign typed data with wallet.');
    } finally {
      setIsSigning(false);
    }
  };

  // Verify Typed Data On-Chain
  const handleVerifyOnChain = async () => {
    setErrorMessage(null);

    const activeContract = (contractAddress || CONTRACT_ADDRESS).trim() as `0x${string}`;
    if (!activeContract || !isAddress(activeContract)) {
      setErrorMessage('Contract address is not set or invalid.');
      return;
    }

    if (!signature.trim() || !isHex(signature.trim())) {
      setErrorMessage('Please enter a valid hexadecimal signature (0x...).');
      return;
    }

    if (!calculatedDomainSeparator || !calculatedStructHash || !calculatedDigest) {
      setErrorMessage('Invalid EIP-712 parameters or JSON formatting.');
      return;
    }

    const cleanExpected = expectedSigner.trim();
    if (cleanExpected && !isAddress(cleanExpected)) {
      setErrorMessage('Expected signer must be a valid Ethereum address (0x...) or left blank.');
      return;
    }

    const breakdown = decomposeSignature(signature);

    // Initial off-chain recovery for immediate feedback
    const { recoveredAddress: localRecovered } = await recoverSignerOffChain(
      calculatedDigest,
      signature.trim() as `0x${string}`
    );

    setIsVerifying(true);
    try {
      const targetExpected = (cleanExpected || '0x0000000000000000000000000000000000000000') as `0x${string}`;

      // Call verifyTypedData(domainSeparator, structHash, signature, expectedSigner)
      const txHash = await writeContractAsync({
        address: activeContract,
        abi: CONTRACT_ABI,
        functionName: 'verifyTypedData',
        args: [
          calculatedDomainSeparator,
          calculatedStructHash,
          signature.trim() as `0x${string}`,
          targetExpected,
        ],
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        const logs = parseEventLogs({
          abi: CONTRACT_ABI,
          eventName: 'SignatureVerified',
          logs: receipt.logs,
        });

        const eventData = logs[0]?.args;
        const onChainIsValid = eventData ? eventData.isValid : (localRecovered?.toLowerCase() === cleanExpected?.toLowerCase());
        const onChainRecovered = eventData ? eventData.recoveredSigner : localRecovered;
        const onChainRequestId = eventData ? eventData.requestId : undefined;

        onVerificationComplete({
          digest: calculatedDigest,
          expectedSigner: cleanExpected || undefined,
          recoveredSigner: onChainRecovered || localRecovered || undefined,
          isValid: Boolean(onChainIsValid),
          signerMatched: Boolean(cleanExpected && onChainRecovered && cleanExpected.toLowerCase() === onChainRecovered.toLowerCase()),
          signatureType: 'eip712',
          formatDetails: breakdown || undefined,
          txHash,
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
          requestId: onChainRequestId,
          statusMessage: onChainIsValid ? 'EIP-712 Typed Data verified successfully on-chain.' : 'EIP-712 verification recorded on-chain as invalid or mismatched.',
        });
      }
    } catch (err: any) {
      console.error('EIP-712 Verification error:', err);
      setErrorMessage(err?.shortMessage || err?.message || 'Transaction failed or rejected.');

      if (breakdown) {
        onVerificationComplete({
          digest: calculatedDigest,
          expectedSigner: cleanExpected || undefined,
          recoveredSigner: localRecovered || undefined,
          isValid: Boolean(cleanExpected && localRecovered && cleanExpected.toLowerCase() === localRecovered.toLowerCase()),
          signerMatched: Boolean(cleanExpected && localRecovered && cleanExpected.toLowerCase() === localRecovered.toLowerCase()),
          signatureType: 'eip712',
          formatDetails: breakdown,
          statusMessage: 'Local cryptographic recovery (On-chain transaction was not completed).',
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            Advanced EIP-712 Mode
          </h2>
          <p className="text-xs text-gray-600">
            Typed structured data inspector with domain separator and struct hash verification
          </p>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 font-medium">Presets:</span>
          <button
            type="button"
            onClick={() => handleLoadPreset('permit')}
            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors"
          >
            ERC-2612 Permit
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('mail')}
            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors"
          >
            Ether Mail
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="break-all">{errorMessage}</span>
        </div>
      )}

      {/* Domain Specifications */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-3">
        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          EIP-712 Domain Specification
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Domain Name</label>
            <input
              type="text"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              className="w-full text-xs font-mono p-2 border border-gray-300 rounded bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Version</label>
            <input
              type="text"
              value={domainVersion}
              onChange={(e) => setDomainVersion(e.target.value)}
              className="w-full text-xs font-mono p-2 border border-gray-300 rounded bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Chain ID</label>
            <input
              type="number"
              value={domainChainId}
              onChange={(e) => setDomainChainId(Number(e.target.value))}
              className="w-full text-xs font-mono p-2 border border-gray-300 rounded bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Verifying Contract</label>
            <input
              type="text"
              value={domainVerifyingContract}
              onChange={(e) => setDomainVerifyingContract(e.target.value)}
              placeholder="0x..."
              className="w-full text-xs font-mono p-2 border border-gray-300 rounded bg-white"
            />
          </div>
        </div>
      </div>

      {/* Primary Type, Types JSON & Message JSON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Types Definition (JSON)
            </label>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="text-[11px]">Primary:</span>
              <input
                type="text"
                value={primaryType}
                onChange={(e) => setPrimaryType(e.target.value)}
                className="w-24 text-xs font-mono px-1.5 py-0.5 border border-gray-300 rounded bg-white"
              />
            </div>
          </div>
          <textarea
            rows={7}
            value={typesJson}
            onChange={(e) => setTypesJson(e.target.value)}
            className="w-full text-xs font-mono p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Message Values (JSON)
            </label>
            {isConnected && (
              <button
                type="button"
                onClick={handleSignTypedData}
                disabled={isSigning}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <PenTool className="w-3.5 h-3.5" />
                {isSigning ? 'Signing in wallet...' : 'Sign with Wallet'}
              </button>
            )}
          </div>
          <textarea
            rows={7}
            value={messageJson}
            onChange={(e) => setMessageJson(e.target.value)}
            className="w-full text-xs font-mono p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Calculated Hashes Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 border border-gray-200 rounded font-mono">
        <div>
          <span className="text-[11px] text-gray-500 font-sans font-semibold block">Domain Separator:</span>
          <span className="text-gray-900 break-all">{calculatedDomainSeparator || 'Calculating...'}</span>
        </div>
        <div>
          <span className="text-[11px] text-gray-500 font-sans font-semibold block">EIP-712 Digest:</span>
          <span className="text-gray-900 break-all">{calculatedDigest || 'Calculating...'}</span>
        </div>
      </div>

      {/* Expected Signer Address */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Expected Signer Address
          </label>
          {address && (
            <button
              type="button"
              onClick={() => setExpectedSigner(address)}
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Use My Wallet Address
            </button>
          )}
        </div>
        <input
          type="text"
          value={expectedSigner}
          onChange={(e) => setExpectedSigner(e.target.value)}
          placeholder="0x... (Expected signer)"
          className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* Signature Input */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
          Signature (65-byte hex: r + s + v)
        </label>
        <textarea
          rows={2}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="0x... (Paste EIP-712 signature or use 'Sign with Wallet' above)"
          className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* Submit Verification Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleVerifyOnChain}
          disabled={isVerifying || !signature.trim()}
          className={`w-full py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider text-white transition-colors flex items-center justify-center gap-2 ${
            isVerifying || !signature.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-700 hover:bg-green-800'
          }`}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Recording EIP-712 Verification on BOTChain...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Verify EIP-712 Typed Data On-Chain
            </>
          )}
        </button>
      </div>
    </div>
  );
};

