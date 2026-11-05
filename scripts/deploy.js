import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rpcUrl = process.env.BOTCHAIN_RPC_URL || "https://rpc.bohr.life";
  const chainId = parseInt(process.env.BOTCHAIN_CHAIN_ID || "968", 10);
  const privateKey = process.env.PRIVATE_KEY?.trim();

  if (!privateKey || privateKey.length < 64) {
    console.error("❌ Error: PRIVATE_KEY is not set or invalid in .env");
    console.log("👉 Please open .env and add your private key for BOTChain testnet.");
    process.exit(1);
  }

  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(formattedKey, provider);

  console.log("==========================================");
  console.log("🚀 Deploying BOTSignatureVerify to BOTChain Testnet");
  console.log(`📡 RPC URL: ${rpcUrl}`);
  console.log(`⛓️ Chain ID: ${chainId}`);
  console.log(`👤 Deployer Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} BOT`);

  const artifactPath = path.join(__dirname, "../src/artifacts/contracts/BOTSignatureVerify.sol/BOTSignatureVerify.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ Contract artifact not found. Please compile first using 'npm run compile'.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("⏳ Deploying contract transaction...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("==========================================");
  console.log(`✅ BOTSignatureVerify deployed at: ${deployedAddress}`);
  console.log(`🔍 Explorer link: ${process.env.BOTCHAIN_EXPLORER_URL || "https://scan.bohr.life/"}address/${deployedAddress}`);
  console.log("==========================================");

  // Write deployed address to src/config/contractAddress.json
  const configDir = path.join(__dirname, "../src/config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const deploymentData = {
    address: deployedAddress,
    network: "BOTChain Testnet",
    chainId: chainId,
    rpcUrl: rpcUrl,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
  };

  fs.writeFileSync(
    path.join(configDir, "contractAddress.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("💾 Saved contract address to src/config/contractAddress.json");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});

