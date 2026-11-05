import { defineChain } from 'viem';

export const botchainTestnet = defineChain({
  id: 968,
  name: 'BOTChain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOTScan',
      url: 'https://scan.bohr.life/',
    },
  },
  testnet: true,
});

