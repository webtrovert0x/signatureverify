import React, { useState } from 'react';
import { useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contract';
import { History, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface Props {
  contractAddress: string;
}

export const RecentVerifications: React.FC<Props> = ({ contractAddress }) => {
  const activeContract = (contractAddress || CONTRACT_ADDRESS).trim() as `0x${string}`;
  const isContractValid = activeContract && isAddress(activeContract);

  const {
    data: recentData,
    isLoading,
    refetch,
    isRefetching,
  } = useReadContract({
    address: isContractValid ? activeContract : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getRecentVerifications',
    args: [10n],
    query: {
      enabled: Boolean(isContractValid),
    },
  });

  const records = recentData as any[] | undefined;

  const formatAddress = (addr: string) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'None';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const getTypeName = (typeNum: number) => {
    switch (typeNum) {
      case 0:
        return 'Raw Hash';
      case 1:
        return 'EIP-191 Personal';
      case 2:
        return 'EIP-712 Typed';
      default:
        return 'ECDSA';
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-700" />
          <h2 className="text-base font-bold text-gray-900">Recent On-Chain Verifications</h2>
        </div>
        <button
          onClick={() => refetch()}
          disabled={!isContractValid || isLoading || isRefetching}
          className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!isContractValid ? (
        <div className="text-xs text-gray-500 py-6 text-center">
          Set a valid contract address above to view recorded on-chain verifications.
        </div>
      ) : isLoading ? (
        <div className="text-xs text-gray-500 py-6 text-center flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
          Fetching verification records from BOTChain...
        </div>
      ) : !records || records.length === 0 ? (
        <div className="text-xs text-gray-500 py-6 text-center">
          No verification records yet. Execute a verification above to record the first transaction!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-gray-200">
            <thead className="bg-gray-100 text-gray-700 font-semibold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Req ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Expected</th>
                <th className="py-2.5 px-3">Recovered</th>
                <th className="py-2.5 px-3">Digest</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {records.map((r: any, idx: number) => {
                const reqId = r.requestId?.toString();
                const isValid = Boolean(r.isValid);
                const digestStr = r.digest || '';

                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-blue-700">#{reqId}</td>
                    <td className="py-2.5 px-3 font-sans text-gray-700">
                      <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">
                        {getTypeName(r.verificationType)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600" title={r.expectedSigner}>
                      {formatAddress(r.expectedSigner)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gray-900" title={r.recoveredSigner}>
                      {formatAddress(r.recoveredSigner)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px]" title={digestStr}>
                      {digestStr.substring(0, 10)}...{digestStr.substring(digestStr.length - 8)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {isValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-300 px-1.5 py-0.5 rounded font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-700 bg-red-50 border border-red-300 px-1.5 py-0.5 rounded font-semibold">
                          <XCircle className="w-3 h-3" /> Invalid
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      #{r.blockNumber?.toString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

