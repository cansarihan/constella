import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  READ_SOURCE,
  RPC_URL,
} from "./config";
import type { CampaignState, DonationActivity } from "./types";

export const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });
const contract = new Contract(CONTRACT_ID);

/** get_state'i read-only simülasyonla okur. */
export async function readState(): Promise<CampaignState> {
  const source = new Account(READ_SOURCE, "0");
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_state"))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  const retval = sim.result?.retval;
  if (!retval) throw new Error("Kontrat durumu okunamadı");
  const raw = scValToNative(retval);
  return {
    admin: raw.admin,
    token: raw.token,
    title: raw.title,
    goal: BigInt(raw.goal),
    deadline: BigInt(raw.deadline),
    raised: BigInt(raw.raised),
    contributors: Number(raw.contributors),
    withdrawn: Boolean(raw.withdrawn),
  };
}

/** Bir adresin toplam bağışını (stroop) okur. */
export async function readContribution(donor: string): Promise<bigint> {
  const source = new Account(READ_SOURCE, "0");
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_contribution", new Address(donor).toScVal()))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return 0n;
  const retval = sim.result?.retval;
  return retval ? BigInt(scValToNative(retval)) : 0n;
}

/** donate çağrısını kurar, simüle eder (auth dahil) ve imzaya hazır XDR döner. */
export async function buildDonateTx(
  donor: string,
  amountStroops: bigint
): Promise<string> {
  const account = await server.getAccount(donor);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "donate",
        new Address(donor).toScVal(),
        nativeToScVal(amountStroops, { type: "i128" })
      )
    )
    .setTimeout(120)
    .build();

  // prepareTransaction simüle eder; kontrat hatası / yetersiz bakiye burada yakalanır.
  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

/** withdraw çağrısını kurar ve imzaya hazır XDR döner (sadece admin). */
export async function buildWithdrawTx(admin: string): Promise<string> {
  const account = await server.getAccount(admin);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("withdraw"))
    .setTimeout(120)
    .build();
  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

/** İmzalı XDR'ı ağa gönderir ve sonuç kesinleşene kadar bekler; tx hash döner. */
export async function submitSigned(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sent = await server.sendTransaction(tx);

  if (sent.status === "ERROR") {
    throw new Error(JSON.stringify(sent.errorResult) || "İşlem reddedildi");
  }

  const hash = sent.hash;
  // Kesinleşmeyi bekle (pending → success/fail).
  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("İşlem zincirde başarısız oldu (FAILED)");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("İşlem zaman aşımına uğradı");
}

export async function getLatestLedger(): Promise<number> {
  const l = await server.getLatestLedger();
  return l.sequence;
}

/** Kontrat event'lerini çeker ve bağış aktivitelerine dönüştürür. */
export async function fetchEvents(opts: {
  startLedger?: number;
  cursor?: string;
}): Promise<{ activities: DonationActivity[]; cursor?: string; latestLedger: number }> {
  const req: Record<string, unknown> = {
    filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
    limit: 200,
  };
  if (opts.cursor) req.cursor = opts.cursor;
  else if (opts.startLedger) req.startLedger = opts.startLedger;

  const resp = await server.getEvents(req as Parameters<typeof server.getEvents>[0]);
  const activities: DonationActivity[] = [];

  for (const ev of resp.events) {
    try {
      const topics = ev.topic.map((t) => scValToNative(t));
      if (topics[0] !== "donation_event") continue;
      const donor = topics[1] as string;
      const val = scValToNative(ev.value) as {
        amount: bigint;
        total_raised: bigint;
      };
      activities.push({
        id: ev.id,
        donor,
        amount: BigInt(val.amount),
        totalRaised: BigInt(val.total_raised),
        ledger: ev.ledger,
        at: ev.ledgerClosedAt,
      });
    } catch {
      // bilinmeyen event biçimi — atla
    }
  }

  return {
    activities,
    cursor: resp.cursor || opts.cursor,
    latestLedger: resp.latestLedger,
  };
}

export type WalletErrorKind =
  | "wallet_not_found"
  | "user_rejected"
  | "insufficient_balance"
  | "invalid_amount"
  | "deadline_passed"
  | "goal_not_reached"
  | "modal_closed"
  | "unknown";

export interface FriendlyError {
  kind: WalletErrorKind;
  title: string;
  message: string;
}

/** Ham hatayı kullanıcı dostu, kategorize bir mesaja çevirir. */
export function parseError(e: unknown): FriendlyError {
  const raw =
    e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
  const s = (raw || "").toLowerCase();

  if (s.includes("wallet_modal_closed")) {
    return { kind: "modal_closed", title: "İptal edildi", message: "Cüzdan seçimi kapatıldı." };
  }
  if (
    s.includes("not available") ||
    s.includes("not installed") ||
    s.includes("no wallet") ||
    s.includes("could not be found") ||
    s.includes("is not connected") ||
    s.includes("extension")
  ) {
    return {
      kind: "wallet_not_found",
      title: "Cüzdan bulunamadı",
      message: "Seçtiğin cüzdan tarayıcında kurulu/etkin değil. Lütfen kur ve tekrar dene.",
    };
  }
  if (
    s.includes("reject") ||
    s.includes("denied") ||
    s.includes("declined") ||
    s.includes("cancell") ||
    s.includes("user refused")
  ) {
    return {
      kind: "user_rejected",
      title: "İşlem reddedildi",
      message: "İşlemi cüzdanında onaylamadın.",
    };
  }
  if (
    s.includes("insufficient") ||
    s.includes("underfunded") ||
    s.includes("txinsufficientbalance") ||
    s.includes("balance is not enough") ||
    s.includes("#10")
  ) {
    return {
      kind: "insufficient_balance",
      title: "Yetersiz bakiye",
      message: "Cüzdanında bu bağış + işlem ücreti için yeterli XLM yok.",
    };
  }
  if (s.includes("#3") || s.includes("invalidamount")) {
    return { kind: "invalid_amount", title: "Geçersiz tutar", message: "Bağış tutarı 0'dan büyük olmalı." };
  }
  if (s.includes("#4") || s.includes("deadlinepassed")) {
    return { kind: "deadline_passed", title: "Süre doldu", message: "Kampanyanın son tarihi geçti." };
  }
  if (s.includes("#5") || s.includes("goalnotreached")) {
    return { kind: "goal_not_reached", title: "Hedefe ulaşılmadı", message: "Hedef tutara ulaşılmadan fon çekilemez." };
  }
  return { kind: "unknown", title: "Bir hata oluştu", message: raw?.slice(0, 200) || "Bilinmeyen hata" };
}
