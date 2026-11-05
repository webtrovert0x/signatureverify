import React from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { ShieldCheck, Wallet, ExternalLink, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="bg-white border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2.5 rounded">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              BOTChain Signature Inspector
              <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded font-mono font-medium">
                EIP-191 / EIP-712
              </span>
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Cryptographic recovery and state-changing on-chain inspection on BOTChain Testnet
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Network indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="font-semibold text-gray-800">BOTChain Testnet</span>
            <span className="text-gray-500 font-mono">(ID: 968)</span>
            <a
              href="https://scan.bohr.life/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 ml-1"
              title="Open Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Wallet Connect */}
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => open()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-300 text-blue-900 rounded text-xs font-mono font-medium hover:bg-blue-100 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-blue-700" />
                {shortenAddress(address)}
              </button>
              <button
                onClick={() => disconnect()}
                title="Disconnect Wallet"
                className="p-1.5 text-gray-500 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => open()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-none transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

