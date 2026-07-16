/** Minimal ABIs for Anonym protocol vaults (Monad). */

export const transferVaultAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ name: "depositId", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "depositId", type: "uint256" },
      { name: "salt", type: "bytes32" },
      { name: "nullifier", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getDeposit",
    stateMutability: "view",
    inputs: [{ name: "depositId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "commitment", type: "bytes32" },
          { name: "amount", type: "uint256" },
          { name: "token", type: "address" },
          { name: "createdAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "claimedBy", type: "address" },
          { name: "nullifier", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "depositCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "depositId", type: "uint256", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "depositId", type: "uint256", indexed: true },
      { name: "claimer", type: "address", indexed: true },
      { name: "nullifier", type: "bytes32", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const campaignVaultAbi = [
  {
    type: "function",
    name: "contribute",
    stateMutability: "payable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawAll",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "balance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "totalContributed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Contributed",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
] as const;

export const campaignFactoryAbi = [
  {
    type: "function",
    name: "createVault",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "vault", type: "address" }],
  },
  {
    type: "function",
    name: "vaultOf",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;
