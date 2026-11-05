import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      'process.env.REOWN_ID': JSON.stringify(env.REOWN_ID || ''),
      'process.env.BOTCHAIN_RPC_URL': JSON.stringify(env.BOTCHAIN_RPC_URL || 'https://rpc.bohr.life'),
      'process.env.BOTCHAIN_CHAIN_ID': JSON.stringify(env.BOTCHAIN_CHAIN_ID || '968'),
      'process.env.BOTCHAIN_EXPLORER_URL': JSON.stringify(env.BOTCHAIN_EXPLORER_URL || 'https://scan.bohr.life/'),
    },
  };
});

