require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    botchain: {
      url: process.env.BOTCHAIN_RPC_URL || "https://rpc.bohr.life",
      chainId: parseInt(process.env.BOTCHAIN_CHAIN_ID || "968", 10),
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length >= 64
        ? [process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`]
        : [],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./src/artifacts",
  },
};
