export interface CampaignState {
  admin: string;
  token: string;
  title: string;
  goal: bigint;
  deadline: bigint;
  raised: bigint;
  contributors: number;
  withdrawn: boolean;
}

export type TxPhase =
  | "idle"
  | "building"
  | "signing"
  | "pending"
  | "success"
  | "error";

export interface TxState {
  phase: TxPhase;
  hash?: string;
  message?: string;
}

export interface DonationActivity {
  id: string;
  donor: string;
  amount: bigint;
  totalRaised: bigint;
  ledger: number;
  at: string;
}
