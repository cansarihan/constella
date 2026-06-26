import { Networks } from "@stellar/stellar-sdk";

// Crowdfunding contract deployed to testnet.
// Can be overridden with VITE_CONTRACT_ID in .env.
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CCK7G4YW4SYV5BEGMIHWRMXHRXYHIB7PIWEO76H7FLJAYSOK62DKXKBP";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE = Networks.TESTNET;

// Source account for read-only simulation (no real signature required).
export const READ_SOURCE =
  "GBHD3KOEMQVFNKBSW3ZVM6MMX3GSHM4PNRXI3HJZ6FJ4AUGZFN2ZC5SL";

export const EXPLORER_TX = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const EXPLORER_CONTRACT = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;
export const EXPLORER_ACCOUNT = (id: string) =>
  `https://stellar.expert/explorer/testnet/account/${id}`;

// Native XLM = 7 decimals (stroops).
export const STROOPS = 10_000_000n;
