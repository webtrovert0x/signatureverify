import React, { useState } from 'react';
import { VerificationResultData } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Copy, Check, ArrowRight } from 'lucide-react';

interface Props {
  result: VerificationResultData | null;
  onClear?: () => void;
}

export const VerificationResult: React.FC<Props> = ({ result, onClear }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!result) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isSignerMatch =
    result.expectedSigner &&
    result.recoveredSigner &&
    result.expectedSigner.toLowerCase() === result.recoveredSigner.toLowerCase();

  return (
    <div className="bg-white border border-gray-300 rounded p-5 space-y-5">
      {/* Top Banner Status */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          {result.isValid ? (
            <div className="p-2 bg-green-100 border border-green-300 text-green-700 rounded">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2 bg-red-100 border border-red-300 text-red-700 rounded">
              <XCircle className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">
                {result.isValid
                  ? 'Signature Valid & Verified'
                  : result.statusMessage || 'Signature Verification Failed'}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium border ${
                  result.isValid
                    ? 'bg-green-50 text-green-800 border-green-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {result.isValid ? 'VALID' : 'INVALID'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Type: {result.signatureType === 'eip712' ? 'EIP-712 Typed Data' : result.signatureType === 'eip191_personal' ? 'EIP-191 Personal Sign' : 'Raw 32-Byte Hash'}
            </p>
          </div>
        </div>

        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear Result
          </button>
        )}
      </div>

      {/* Signer Inspection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expected Signer */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Expected Signer
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-gray-900 break-all">
              {result.expectedSigner || 'None specified (Any valid signer)'}
            </span>
            {result.expectedSigner && (
              <button
                onClick={() => copyToClipboard(result.expectedSigner!, 'expected')}
                className="text-gray-400 hover:text-gray-700 ml-2"
                title="Copy address"
              >
                {copiedField === 'expected' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Recovered Signer */}
        <div
          className={`p-3 rounded border ${
            isSignerMatch
              ? 'bg-green-50 border-green-200'
              : result.recoveredSigner
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-700">
              Recovered Signer
            </div>
            {result.recoveredSigner && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded font-medium border ${
                  isSignerMatch
                    ? 'bg-green-200 text-green-900 border-green-300'
                    : 'bg-amber-200 text-amber-900 border-amber-300'
                }`}
              >
                {isSignerMatch ? 'Matched' : 'Signer Mismatch'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-gray-900 break-all">
              {result.recoveredSigner || 'Could not recover (Malformed or invalid)'}
            </span>
            {result.recoveredSigner && (
              <button
                onClick={() => copyToClipboard(result.recoveredSigner!, 'recovered')}
                className="text-gray-400 hover:text-gray-700 ml-2"
                title="Copy recovered address"
              >
                {copiedField === 'recovered' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message Hash / Digest */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Calculated Message Hash / Digest (32 bytes)
          </span>
          <button
            onClick={() => copyToClipboard(result.digest, 'digest')}
            className="text-gray-400 hover:text-gray-700 flex items-center gap-1 text-xs"
          >
            {copiedField === 'digest' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Hash
          </button>
        </div>
        <div className="font-mono text-xs text-gray-900 break-all bg-white p-2 border border-gray-200 rounded">
          {result.digest}
        </div>
      </div>

      {/* Signature Format Breakdown (r, s, v) */}
      {result.formatDetails && (
        <div className="border border-gray-200 rounded p-3 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Signature Anatomy & Format
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] px-2 py-0.5 rounded border ${
                  result.formatDetails.isLengthValid
                    ? 'bg-gray-100 text-gray-800 border-gray-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                Length: {result.formatDetails.length} bytes
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded border ${
                  !result.formatDetails.isMalleable
                    ? 'bg-green-50 text-green-800 border-green-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {!result.formatDetails.isMalleable ? 'Non-malleable (Low S)' : 'Malleable (High S)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-xs">
            <div className="bg-white p-2 border border-gray-200 rounded">
              <span className="text-[10px] text-gray-500 font-sans block font-semibold">r (32 bytes)</span>
              <span className="break-all text-gray-800">{result.formatDetails.r}</span>
            </div>
            <div className="bg-white p-2 border border-gray-200 rounded">
              <span className="text-[10px] text-gray-500 font-sans block font-semibold">s (32 bytes)</span>
              <span className="break-all text-gray-800">{result.formatDetails.s}</span>
            </div>
            <div className="bg-white p-2 border border-gray-200 rounded">
              <span className="text-[10px] text-gray-500 font-sans block font-semibold">v (1 byte)</span>
              <span className="text-gray-800 font-bold">
                {result.formatDetails.v} (yParity: {result.formatDetails.yParity})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* On-Chain Verification Transaction */}
      {result.txHash && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              On-Chain Verification Transaction
            </span>
            {result.requestId && (
              <span className="text-xs bg-blue-200 text-blue-900 font-mono px-2 py-0.5 rounded font-semibold">
                Request ID: #{result.requestId.toString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-gray-500 block">Transaction Hash:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-blue-900 truncate max-w-[280px]">
                  {result.txHash}
                </span>
                <a
                  href={`https://scan.bohr.life/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium ml-1"
                >
                  View on BOTScan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-700">
              {result.blockNumber && (
                <div>
                  <span className="text-gray-500 block">Mined Block:</span>
                  <span className="font-mono font-medium">#{result.blockNumber}</span>
                </div>
              )}
              {result.gasUsed && (
                <div>
                  <span className="text-gray-500 block">Gas Used:</span>
                  <span className="font-mono font-medium">{result.gasUsed.toString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

