// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title BOTSignatureVerify
 * @notice On-chain cryptographic signature inspector and verifier for BOTChain.
 *         Supports EIP-191 personal_sign / raw hashes and EIP-712 typed structured data.
 *         All verification functions are state-changing, generating an auditable on-chain record.
 */
contract BOTSignatureVerify {
    using ECDSA for bytes32;

    enum VerificationType {
        RAW_MESSAGE_HASH,
        ETH_SIGNED_MESSAGE,
        TYPED_DATA_EIP712
    }

    enum VerificationStatus {
        VALID,
        SIGNER_MISMATCH,
        INVALID_SIGNATURE_LENGTH,
        INVALID_SIGNATURE_S,
        INVALID_SIGNATURE_V,
        MALFORMED_SIGNATURE
    }

    struct VerificationRecord {
        uint256 requestId;
        uint256 timestamp;
        uint256 blockNumber;
        address caller;
        bytes32 digest;
        address expectedSigner;
        address recoveredSigner;
        bool isValid;
        VerificationType verificationType;
        VerificationStatus status;
        bytes signature;
    }

    uint256 public nextRequestId = 1;
    
    // Mapping from requestId => VerificationRecord
    mapping(uint256 => VerificationRecord) public verificationRecords;
    
    // Recent request IDs list
    uint256[] public allRequestIds;

    // Mapping from user/caller => their request IDs
    mapping(address => uint256[]) private userRequestIds;

    event SignatureVerified(
        uint256 indexed requestId,
        address indexed caller,
        address indexed expectedSigner,
        address recoveredSigner,
        bytes32 digest,
        bool isValid,
        VerificationType verificationType,
        VerificationStatus status
    );

    /**
     * @notice Verifies an arbitrary-length message string/bytes with EIP-191 personal_sign prefix.
     * @param message The arbitrary-length message bytes.
     * @param signature The 65-byte ECDSA signature.
     * @param expectedSigner The anticipated signer address.
     */
    function verifyMessage(
        bytes calldata message,
        bytes calldata signature,
        address expectedSigner
    ) external returns (uint256 requestId, bool isValid, address recoveredSigner) {
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(message);
        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(ethHash, signature);

        (isValid, recoveredSigner, requestId) = _processVerification(
            ethHash,
            signature,
            expectedSigner,
            recovered,
            err,
            VerificationType.ETH_SIGNED_MESSAGE
        );
    }

    /**
     * @notice Verifies an EIP-191 or raw message hash signature against an expected signer.
     * @dev State-changing on-chain inspection. Malformed signatures are caught safely without reverting.
     * @param messageHash The 32-byte hash (or raw digest) of the message.
     * @param signature The 65-byte ECDSA signature (r, s, v).
     * @param expectedSigner The anticipated signer address.
     * @return requestId The unique on-chain ID for this verification record.
     * @return isValid True if signature is cryptographically valid and matches expectedSigner.
     * @return recoveredSigner The address recovered from the signature (or address(0) if malformed).
     */
    function verifySignature(
        bytes32 messageHash,
        bytes calldata signature,
        address expectedSigner
    ) external returns (uint256 requestId, bool isValid, address recoveredSigner) {
        // Try recovering directly from raw messageHash
        (address recoveredRaw, ECDSA.RecoverError errRaw, ) = ECDSA.tryRecover(messageHash, signature);

        VerificationType vType = VerificationType.RAW_MESSAGE_HASH;
        address recovered = recoveredRaw;
        ECDSA.RecoverError finalErr = errRaw;

        // If raw didn't match expected, also test whether this was an eth_sign / personal_sign formatted hash
        if (recoveredRaw != expectedSigner && expectedSigner != address(0)) {
            bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
            (address recoveredEth, ECDSA.RecoverError errEth, ) = ECDSA.tryRecover(ethHash, signature);
            if (recoveredEth == expectedSigner) {
                recovered = recoveredEth;
                finalErr = errEth;
                vType = VerificationType.ETH_SIGNED_MESSAGE;
                messageHash = ethHash;
            }
        }

        (isValid, recoveredSigner, requestId) = _processVerification(
            messageHash,
            signature,
            expectedSigner,
            recovered,
            finalErr,
            vType
        );
    }

    /**
     * @notice Verifies an EIP-712 typed structured data signature against an expected signer.
     * @dev State-changing on-chain inspection using standard EIP-712 digest encoding.
     * @param domainSeparator The EIP-712 domain separator hash.
     * @param structHash The EIP-712 struct hash.
     * @param signature The 65-byte ECDSA signature (r, s, v).
     * @param expectedSigner The anticipated signer address.
     * @return requestId The unique on-chain ID for this verification record.
     * @return isValid True if signature is cryptographically valid and matches expectedSigner.
     * @return recoveredSigner The address recovered from the signature (or address(0) if malformed).
     */
    function verifyTypedData(
        bytes32 domainSeparator,
        bytes32 structHash,
        bytes calldata signature,
        address expectedSigner
    ) external returns (uint256 requestId, bool isValid, address recoveredSigner) {
        bytes32 digest = MessageHashUtils.toTypedDataHash(domainSeparator, structHash);
        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, signature);

        (isValid, recoveredSigner, requestId) = _processVerification(
            digest,
            signature,
            expectedSigner,
            recovered,
            err,
            VerificationType.TYPED_DATA_EIP712
        );
    }

    /**
     * @dev Internal processor that evaluates recovery result, stores record, and emits event.
     */
    function _processVerification(
        bytes32 digest,
        bytes calldata signature,
        address expectedSigner,
        address recovered,
        ECDSA.RecoverError err,
        VerificationType vType
    ) internal returns (bool isValid, address recoveredSigner, uint256 requestId) {
        VerificationStatus status;

        if (err == ECDSA.RecoverError.NoError) {
            recoveredSigner = recovered;
            if (expectedSigner != address(0) && recovered == expectedSigner) {
                isValid = true;
                status = VerificationStatus.VALID;
            } else if (expectedSigner == address(0)) {
                // If expectedSigner is empty, valid if ECDSA succeeded
                isValid = (recovered != address(0));
                status = isValid ? VerificationStatus.VALID : VerificationStatus.MALFORMED_SIGNATURE;
            } else {
                isValid = false;
                status = VerificationStatus.SIGNER_MISMATCH;
            }
        } else {
            isValid = false;
            recoveredSigner = address(0);
            if (err == ECDSA.RecoverError.InvalidSignatureLength) {
                status = VerificationStatus.INVALID_SIGNATURE_LENGTH;
            } else if (err == ECDSA.RecoverError.InvalidSignatureS) {
                status = VerificationStatus.INVALID_SIGNATURE_S;
            } else {
                status = VerificationStatus.MALFORMED_SIGNATURE;
            }
        }

        requestId = nextRequestId++;
        VerificationRecord storage record = verificationRecords[requestId];
        record.requestId = requestId;
        record.timestamp = block.timestamp;
        record.blockNumber = block.number;
        record.caller = msg.sender;
        record.digest = digest;
        record.expectedSigner = expectedSigner;
        record.recoveredSigner = recoveredSigner;
        record.isValid = isValid;
        record.verificationType = vType;
        record.status = status;
        record.signature = signature;

        allRequestIds.push(requestId);
        userRequestIds[msg.sender].push(requestId);

        emit SignatureVerified(
            requestId,
            msg.sender,
            expectedSigner,
            recoveredSigner,
            digest,
            isValid,
            vType,
            status
        );
    }

    /**
     * @notice Query total number of recorded verifications.
     */
    function getTotalVerifications() external view returns (uint256) {
        return allRequestIds.length;
    }

    /**
     * @notice Query request IDs recorded by a specific caller.
     */
    function getUserRequestIds(address user) external view returns (uint256[] memory) {
        return userRequestIds[user];
    }

    /**
     * @notice Fetch a batch of recent verification records for frontend display.
     */
    function getRecentVerifications(uint256 count) external view returns (VerificationRecord[] memory) {
        uint256 total = allRequestIds.length;
        if (total == 0) {
            return new VerificationRecord[](0);
        }

        uint256 limit = count > total ? total : count;
        VerificationRecord[] memory records = new VerificationRecord[](limit);

        for (uint256 i = 0; i < limit; i++) {
            uint256 reqId = allRequestIds[total - 1 - i];
            records[i] = verificationRecords[reqId];
        }

        return records;
    }
}
