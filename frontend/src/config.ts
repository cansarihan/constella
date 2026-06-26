import { Networks } from "@stellar/stellar-sdk";

// Testnet'e deploy edilmiş crowdfunding kontratı.
// .env ile VITE_CONTRACT_ID vererek override edilebilir.
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CCK7G4YW4SYV5BEGMIHWRMXHRXYHIB7PIWEO76H7FLJAYSOK62DKXKBP";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE = Networks.TESTNET;

// State okuması (read-only simülasyon) için kaynak hesap — gerçek imza gerektirmez.
export const READ_SOURCE =
  "GBHD3KOEMQVFNKBSW3ZVM6MMX3GSHM4PNRXI3HJZ6FJ4AUGZFN2ZC5SL";

export const EXPLORER_TX = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const EXPLORER_CONTRACT = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;
export const EXPLORER_ACCOUNT = (id: string) =>
  `https://stellar.expert/explorer/testnet/account/${id}`;

// Native XLM = 7 ondalık (stroop).
export const STROOPS = 10_000_000n;
