import React, { useState } from 'react';
import { Header } from './components/Header';
import { SignatureInspector } from './components/SignatureInspector';
import { EIP712Inspector } from './components/EIP712Inspector';
import { VerificationResult } from './components/VerificationResult';
import { RecentVerifications } from './components/RecentVerifications';
import { CONTRACT_ADDRESS } from './config/contract';
import { VerificationResultData } from './types';
import { Shield, Layers, FileCheck, HelpCircle, Terminal, Check } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'standard' | 'eip712' | 'history'>('standard');
  const [contractAddress, setContractAddress] = useState<string>(
    localStorage.getItem('botchain_contract_address') || CONTRACT_ADDRESS || ''
  );
  const [isEditingContract, setIsEditingContract] = useState<boolean>(false);
  const [tempAddress, setTempAddress] = useState<string>(contractAddress);
  const [latestResult, setLatestResult] = useState<VerificationResultData | null>(null);

  const handleSaveContract = () => {
    const trimmed = tempAddress.trim();
    setContractAddress(trimmed);
    localStorage.setItem('botchain_contract_address', trimmed);
    setIsEditingContract(false);
  };

  const handleVerificationDone = (res: VerificationResultData) => {
    setLatestResult(res);
    // Smooth scroll to result
    const el = document.getElementById('verification-result-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Contract Address & Network Status Banner */}
        <div className="bg-white border border-gray-300 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="font-bold text-gray-700 uppercase tracking-wider">
              BOTSignatureVerify Contract:
            </span>
            {isEditingContract ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="0x... (Deployed contract address)"
                  className="font-mono text-xs px-2.5 py-1 border border-gray-300 rounded w-80 bg-white"
                />
                <button
                  onClick={handleSaveContract}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingContract(false)}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono bg-gray-100 border border-gray-200 px-2 py-1 rounded text-gray-800 break-all">
                  {contractAddress || 'Not configured yet (Deploy or enter contract address)'}
                </span>
                <button
                  onClick={() => {
                    setTempAddress(contractAddress);
                    setIsEditingContract(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-gray-600">
            <div>
              RPC: <span className="font-mono text-gray-800">https://rpc.bohr.life</span>
            </div>
            <div>
              Chain ID: <span className="font-mono text-gray-800">968</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-300 bg-white rounded-t px-2 pt-2">
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'standard'
                ? 'border-blue-600 text-blue-700 bg-gray-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Signature Inspector (EIP-191 / Raw)
          </button>

          <button
            onClick={() => setActiveTab('eip712')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'eip712'
                ? 'border-blue-600 text-blue-700 bg-gray-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Advanced EIP-712 Mode
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-700 bg-gray-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            On-Chain Audit Records
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'standard' && (
          <SignatureInspector
            onVerificationComplete={handleVerificationDone}
            contractAddress={contractAddress}
          />
        )}

        {activeTab === 'eip712' && (
          <EIP712Inspector
            onVerificationComplete={handleVerificationDone}
            contractAddress={contractAddress}
          />
        )}

        {activeTab === 'history' && (
          <RecentVerifications contractAddress={contractAddress} />
        )}

        {/* Result Section */}
        <div id="verification-result-section">
          <VerificationResult
            result={latestResult}
            onClear={() => setLatestResult(null)}
          />
        </div>

        {/* Security & Deployment Info Callout */}
        <div className="bg-white border border-gray-300 rounded p-4 text-xs text-gray-700 space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Security & On-Chain Audit Guarantee
          </div>
          <p>
            • <strong>No Private Keys or Seed Phrases:</strong> All signatures are generated safely through your connected Web3 wallet (MetaMask, Rabby, etc.) or pasted in as raw cryptographic signatures.
          </p>
          <p>
            • <strong>Actual On-Chain Inspection:</strong> Verification is executed by <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">BOTSignatureVerify.sol</code> via non-view state-changing transactions on BOTChain Testnet, generating an immutable audit trail with unique Request IDs.
          </p>
          <p>
            • <strong>OpenZeppelin ECDSA Safe Recovery:</strong> Malformed, invalid-length, or malleable signatures are safely trapped and recorded on-chain without throwing unhandled reverts.
          </p>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-300 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-500">
          BOTChain Testnet Signature Inspector & Verifier • Chain ID 968 • BOT Token
        </div>
      </footer>
    </div>
  );
};

