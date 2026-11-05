const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BOTSignatureVerify On-Chain Cryptographic Tests", function () {
  let verifier;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const VerifierFactory = await ethers.getContractFactory("BOTSignatureVerify");
    verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();
  });

  it("should record and verify valid EIP-191 personal_sign signature via verifyMessage", async function () {
    const message = "Hello BOTChain Testnet!";
    const messageBytes = ethers.toUtf8Bytes(message);

    // Sign with user1
    const signature = await user1.signMessage(message);

    // Verify on-chain with state-changing tx
    const tx = await verifier.verifyMessage(messageBytes, signature, user1.address);
    const receipt = await tx.wait();

    // Check emitted event
    const event = receipt.logs
      .map((log) => {
        try {
          return verifier.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "SignatureVerified");

    expect(event).to.not.be.null;
    expect(event.args.isValid).to.be.true;
    expect(event.args.expectedSigner.toLowerCase()).to.equal(user1.address.toLowerCase());
    expect(event.args.recoveredSigner.toLowerCase()).to.equal(user1.address.toLowerCase());

    // Check on-chain persistent record
    const record = await verifier.verificationRecords(event.args.requestId);
    expect(record.isValid).to.be.true;
    expect(record.recoveredSigner.toLowerCase()).to.equal(user1.address.toLowerCase());
  });

  it("should record and verify valid 32-byte digest via verifySignature", async function () {
    const rawDigest = ethers.keccak256(ethers.toUtf8Bytes("Arbitrary payload"));

    // Sign digest
    const signature = await user1.signMessage(ethers.getBytes(rawDigest));

    // Verify on-chain with state-changing tx
    const tx = await verifier.verifySignature(rawDigest, signature, user1.address);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return verifier.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "SignatureVerified");

    expect(event).to.not.be.null;
    expect(event.args.isValid).to.be.true;
    expect(event.args.expectedSigner.toLowerCase()).to.equal(user1.address.toLowerCase());
    expect(event.args.recoveredSigner.toLowerCase()).to.equal(user1.address.toLowerCase());
  });

  it("should detect and record signer mismatch safely", async function () {
    const message = "Hello BOTChain Testnet!";
    const messageBytes = ethers.toUtf8Bytes(message);

    // Sign with user1 but pass user2 as expected signer
    const signature = await user1.signMessage(message);

    const tx = await verifier.verifyMessage(messageBytes, signature, user2.address);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return verifier.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "SignatureVerified");

    expect(event.args.isValid).to.be.false;
    expect(event.args.expectedSigner.toLowerCase()).to.equal(user2.address.toLowerCase());
    expect(event.args.recoveredSigner.toLowerCase()).to.equal(user1.address.toLowerCase());
  });

  it("should safely handle malformed signature without reverting transaction", async function () {
    const messageHash = ethers.id("test message");
    const malformedSignature = "0x123456"; // Invalid length

    const tx = await verifier.verifySignature(messageHash, malformedSignature, user1.address);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return verifier.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "SignatureVerified");

    expect(event.args.isValid).to.be.false;
    expect(event.args.recoveredSigner).to.equal(ethers.ZeroAddress);
  });

  it("should verify EIP-712 typed structured data signature", async function () {
    const domain = {
      name: "BOT USD",
      version: "1",
      chainId: 968,
      verifyingContract: await verifier.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const value = {
      owner: user1.address,
      spender: user2.address,
      value: 1000n,
      nonce: 0n,
      deadline: 1893456000n,
    };

    const signature = await user1.signTypedData(domain, types, value);

    // Compute domainSeparator and structHash
    const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
    const structHash = ethers.TypedDataEncoder.from(types).hash(value);

    const tx = await verifier.verifyTypedData(
      domainSeparator,
      structHash,
      signature,
      user1.address
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return verifier.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "SignatureVerified");

    expect(event.args.isValid).to.be.true;
    expect(event.args.recoveredSigner.toLowerCase()).to.equal(user1.address.toLowerCase());
  });
});
