import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { botchainTestnet } from './botchain';

// 1. Get projectId from process.env.REOWN_ID (configured in .env)
export const projectId = (process.env.REOWN_ID || '').trim() || 'demo_reown_project_id';

// 2. Metadata for Reown AppKit
export const metadata = {
  name: 'BOT SignatureVerify',
  description: 'EIP-191 & EIP-712 On-Chain Signature Inspector for BOTChain',
  url: 'https://scan.bohr.life',
  icons: ['https://scan.bohr.life/favicon.ico'],
};

// 3. Define supported networks
export const networks = [botchainTestnet];

// 4. Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

// 5. Create AppKit modal instance
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [botchainTestnet],
  defaultNetwork: botchainTestnet,
  projectId,
  metadata,
  themeMode: 'light',
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeVariables: {
    '--w3m-accent': '#2563eb',
    '--w3m-border-radius-master': '4px',
  },
});

export const config = wagmiAdapter.wagmiConfig;

