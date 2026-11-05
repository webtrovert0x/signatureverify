import {
  hashMessage,
  recoverAddress,
  keccak256,
  stringToBytes,
  isHex,
  slice,
  hexToNumber,
  hashTypedData,
  TypedDataDefinition,
} from 'viem';
import { SignatureBreakdown } from '../types';

// secp256k1 half curve order for malleability check (EIP-2 / OZ standard)
const SECP256K1_HALF_ORDER = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;

/**
 * Decomposes and validates a raw hex signature into r, s, v components.
 */
export function decomposeSignature(signatureHex: string): SignatureBreakdown | null {
  const cleanHex = signatureHex.trim();
  if (!isHex(cleanHex)) {
    return null;
  }

  // A standard signature is 65 bytes (130 hex characters + "0x" = 132 chars)
  const lengthInBytes = (cleanHex.length - 2) / 2;
  const isLengthValid = lengthInBytes === 65;

  if (!isLengthValid || cleanHex.length < 132) {
    return {
      raw: cleanHex,
      r: '0x0000000000000000000000000000000000000000000000000000000000000000',
      s: '0x0000000000000000000000000000000000000000000000000000000000000000',
      v: 0,
      yParity: 0,
      length: lengthInBytes,
      isLengthValid: false,
      isSValid: false,
      isVValid: false,
      isMalleable: false,
    };
  }

  try {
    const r = slice(cleanHex as `0x${string}`, 0, 32);
    const s = slice(cleanHex as `0x${string}`, 32, 64);
    const vRaw = slice(cleanHex as `0x${string}`, 64, 65);
    const vNum = hexToNumber(vRaw);

    let v = vNum;
    let yParity = 0;
    let isVValid = false;

    if (vNum === 27 || vNum === 28) {
      v = vNum;
      yParity = vNum - 27;
      isVValid = true;
    } else if (vNum === 0 || vNum === 1) {
      v = vNum + 27;
      yParity = vNum;
      isVValid = true;
    }

    const sBigInt = BigInt(s);
    const isMalleable = sBigInt > SECP256K1_HALF_ORDER;
    const isSValid = !isMalleable && sBigInt > 0n;

    return {
      raw: cleanHex,
      r,
      s,
      v,
      yParity,
      length: lengthInBytes,
      isLengthValid: true,
      isSValid,
      isVValid,
      isMalleable,
    };
  } catch {
    return null;
  }
}

/**
 * Computes message hash for EIP-191 personal_sign or raw hex.
 */
export function computeMessageDigest(
  message: string,
  isRawHash: boolean
): { digest: `0x${string}`; error?: string } {
  try {
    if (isRawHash) {
      const clean = message.trim();
      if (!isHex(clean) || clean.length !== 66) {
        return {
          digest: '0x0000000000000000000000000000000000000000000000000000000000000000',
          error: 'Raw hash must be a valid 32-byte hexadecimal string (66 characters starting with 0x)',
        };
      }
      return { digest: clean as `0x${string}` };
    }

    // EIP-191 personal_sign: \x19Ethereum Signed Message:\n<len><msg>
    const digest = hashMessage(message);
    return { digest };
  } catch (err: any) {
    return {
      digest: '0x0000000000000000000000000000000000000000000000000000000000000000',
      error: err?.message || 'Failed to compute message digest',
    };
  }
}

/**
 * Recovers signer address off-chain using viem for quick local validation.
 */
export async function recoverSignerOffChain(
  digest: `0x${string}`,
  signature: `0x${string}`
): Promise<{ recoveredAddress: string | null; error?: string }> {
  try {
    const address = await recoverAddress({
      hash: digest,
      signature,
    });
    return { recoveredAddress: address };
  } catch (err: any) {
    return {
      recoveredAddress: null,
      error: err?.message || 'ECDSA recovery failed',
    };
  }
}

