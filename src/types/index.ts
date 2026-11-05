export type SignatureType = 'eip191_personal' | 'raw_hash' | 'eip712';

export interface SignatureBreakdown {
  raw: string;
  r: `0x${string}`;
  s: `0x${string}`;
  v: number;
  yParity: number;
  length: number;
  isLengthValid: boolean;
  isSValid: boolean;
  isVValid: boolean;
  isMalleable: boolean;
}

export interface VerificationResultData {
  digest: `0x${string}`;
  expectedSigner?: string;
  recoveredSigner?: string;
  isValid: boolean;
  signerMatched: boolean;
  signatureType: SignatureType;
  formatDetails?: SignatureBreakdown;
  txHash?: `0x${string}`;
  blockNumber?: number;
  gasUsed?: bigint;
  requestId?: bigint;
  statusMessage?: string;
  isPendingTx?: boolean;
}

export interface OnChainRecord {
  requestId: bigint;
  timestamp: bigint;
  blockNumber: bigint;
  caller: string;
  digest: `0x${string}`;
  expectedSigner: string;
  recoveredSigner: string;
  isValid: boolean;
  verificationType: number;
  status: number;
  signature: `0x${string}`;
}

export interface EIP712DomainInput {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
  salt?: string;
}

