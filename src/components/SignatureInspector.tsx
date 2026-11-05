import React, { useState } from 'react';
import { useAccount, useSignMessage, useWriteContract, usePublicClient } from 'wagmi';
import { isAddress, isHex, parseEventLogs, stringToBytes } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contract';
import { SignatureType, VerificationResultData } from '../types';
import { decomposeSignature, computeMessageDigest, recoverSignerOffChain } from '../utils/signature';
import { PenTool, CheckCircle, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  onVerificationComplete: (result: VerificationResultData) => void;
  contractAddress: string;
}

export const SignatureInspector: React.FC<Props> = ({ onVerificationComplete, contractAddress }) => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [sigType, setSigType] = useState<SignatureType>('eip191_personal');
  const [message, setMessage] = useState<string>('Hello BOTChain Testnet! Verifying EIP-191 signature on-chain.');
  const [signature, setSignature] = useState<string>('');
  const [expectedSigner, setExpectedSigner] = useState<string>('');
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick preset loader
  const handleLoadSample = (sampleType: 'text' | 'raw') => {
    setErrorMessage(null);
    if (sampleType === 'text') {
      setSigType('eip191_personal');
      setMessage('Hello BOTChain Testnet! Verifying EIP-191 signature on-chain.');
      if (address) {
        setExpectedSigner(address);
      }
    } else {
      setSigType('raw_hash');
      // 32-byte sample hash
      setMessage('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      if (address) {
        setExpectedSigner(address);
      }
    }
  };

  // Sign with connected wallet helper
  const handleSignWithWallet = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first to sign this message.');
      return;
    }
    setErrorMessage(null);
    setIsSigning(true);
    try {
      if (sigType === 'raw_hash') {
        setErrorMessage('Note: Standard browser wallets sign via personal_sign (EIP-191). Switching to EIP-191.');
        setSigType('eip191_personal');
      }

      const sig = await signMessageAsync({ message });
      setSignature(sig);
      setExpectedSigner(address);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to sign message with wallet.');
    } finally {
      setIsSigning(false);
    }
  };

  // Verify on-chain transaction
  const handleVerifyOnChain = async () => {
    setErrorMessage(null);

    const activeContract = (contractAddress || CONTRACT_ADDRESS).trim() as `0x${string}`;
    if (!activeContract || !isAddress(activeContract)) {
      setErrorMessage('Contract address is not set or invalid. Please check the contract configuration.');
      return;
    }

    if (!signature.trim() || !isHex(signature.trim())) {
      setErrorMessage('Please enter a valid hexadecimal signature (0x...).');
      return;
    }

    const { digest, error: digestErr } = computeMessageDigest(message, sigType === 'raw_hash');
    if (digestErr) {
      setErrorMessage(digestErr);
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
      digest,
      signature.trim() as `0x${string}`
    );

    setIsVerifying(true);
    try {
      const targetExpected = (cleanExpected || '0x0000000000000000000000000000000000000000') as `0x${string}`;

      // Submit state-changing transaction on BOTChain
      let txHash: `0x${string}`;

      if (sigType === 'eip191_personal') {
        // Calls verifyMessage for full EIP-191 personal_sign prefix handling
        txHash = await writeContractAsync({
          address: activeContract,
          abi: CONTRACT_ABI,
          functionName: 'verifyMessage',
          args: [stringToBytes(message), signature.trim() as `0x${string}`, targetExpected],
        });
      } else {
        // Calls verifySignature for 32-byte digest
        txHash = await writeContractAsync({
          address: activeContract,
          abi: CONTRACT_ABI,
          functionName: 'verifySignature',
          args: [digest, signature.trim() as `0x${string}`, targetExpected],
        });
      }

      // Wait for transaction receipt
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Parse SignatureVerified event
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
          digest,
          expectedSigner: cleanExpected || undefined,
          recoveredSigner: onChainRecovered || localRecovered || undefined,
          isValid: Boolean(onChainIsValid),
          signerMatched: Boolean(cleanExpected && onChainRecovered && cleanExpected.toLowerCase() === onChainRecovered.toLowerCase()),
          signatureType: sigType,
          formatDetails: breakdown || undefined,
          txHash,
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
          requestId: onChainRequestId,
          statusMessage: onChainIsValid ? 'Signature verified successfully on-chain.' : 'Signature recorded on-chain as invalid or mismatched.',
        });
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      // Even if user rejected or tx failed, display local cryptographic breakdown
      setErrorMessage(err?.shortMessage || err?.message || 'Transaction failed or rejected.');

      if (breakdown) {
        onVerificationComplete({
          digest,
          expectedSigner: cleanExpected || undefined,
          recoveredSigner: localRecovered || undefined,
          isValid: Boolean(cleanExpected && localRecovered && cleanExpected.toLowerCase() === localRecovered.toLowerCase()),
          signerMatched: Boolean(cleanExpected && localRecovered && cleanExpected.toLowerCase() === localRecovered.toLowerCase()),
          signatureType: sigType,
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
          <h2 className="text-base font-bold text-gray-900">Standard Signature Inspector</h2>
          <p className="text-xs text-gray-600">
            Verify EIP-191 personal_sign messages or raw 32-byte hashes on BOTChain
          </p>
        </div>

        {/* Preset helper buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSample('text')}
            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors"
          >
            Load Sample Text
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('raw')}
            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded transition-colors"
          >
            Load Sample Hash
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="break-all">{errorMessage}</span>
        </div>
      )}

      {/* Signature Type Selection */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
          Signature Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSigType('eip191_personal')}
            className={`p-2.5 text-xs font-medium rounded border text-left flex items-center justify-between ${
              sigType === 'eip191_personal'
                ? 'bg-blue-50 border-blue-600 text-blue-900'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div>
              <div className="font-bold">EIP-191 (personal_sign)</div>
              <div className="text-[11px] text-gray-500">Prepends \x19Ethereum Signed Message prefix</div>
            </div>
            {sigType === 'eip191_personal' && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
          </button>

          <button
            type="button"
            onClick={() => setSigType('raw_hash')}
            className={`p-2.5 text-xs font-medium rounded border text-left flex items-center justify-between ${
              sigType === 'raw_hash'
                ? 'bg-blue-50 border-blue-600 text-blue-900'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div>
              <div className="font-bold">Raw 32-Byte Hash</div>
              <div className="text-[11px] text-gray-500">Direct keccak256 hash without prefix</div>
            </div>
            {sigType === 'raw_hash' && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
          </button>
        </div>
      </div>

      {/* Message or Message Hash */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {sigType === 'raw_hash' ? 'Message Hash (32 bytes hex)' : 'Message Content (UTF-8 or Text)'}
          </label>
          {isConnected && sigType === 'eip191_personal' && (
            <button
              type="button"
              onClick={handleSignWithWallet}
              disabled={isSigning}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <PenTool className="w-3.5 h-3.5" />
              {isSigning ? 'Signing in wallet...' : 'Sign with Connected Wallet'}
            </button>
          )}
        </div>
        <textarea
          rows={sigType === 'raw_hash' ? 2 : 3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={sigType === 'raw_hash' ? '0x...' : 'Enter your message to inspect...'}
          className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
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
          placeholder="0x... (e.g. 0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5)"
          className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
          placeholder="0x... (130 hex characters + 0x prefix)"
          className="w-full text-xs font-mono p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
              Recording Verification on BOTChain...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Verify Signature On-Chain
            </>
          )}
        </button>
      </div>
    </div>
  );
};
