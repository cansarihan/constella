import { useState } from "react";
import type { CampaignState } from "../types";
import { formatXLM, toStroops } from "../format";

const QUICK = ["5", "10", "25", "50"];

interface Props {
  state: CampaignState | null;
  address: string | null;
  myContribution: bigint;
  busy: boolean;
  isAdmin: boolean;
  onConnect: () => void;
  onDonate: (amountStroops: bigint) => void;
  onWithdraw: () => void;
}

export function DonatePanel({
  state,
  address,
  myContribution,
  busy,
  isAdmin,
  onConnect,
  onDonate,
  onWithdraw,
}: Props) {
  const [amount, setAmount] = useState("");

  const stroops = toStroops(amount);
  const valid = stroops > 0n;
  const reached = state ? state.raised >= state.goal : false;

  return (
    <div className="card panel">
      <h3>Bağış yap</h3>
      <div className="hint">Native XLM ile testnet üzerinden destek ol.</div>

      <div className="amount-field">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <span className="unit">XLM</span>
      </div>

      <div className="quick">
        {QUICK.map((q) => (
          <button key={q} onClick={() => setAmount(q)} disabled={busy} type="button">
            {q}
          </button>
        ))}
      </div>

      {address ? (
        <button
          className="btn"
          disabled={!valid || busy || (state ? state.withdrawn : false)}
          onClick={() => onDonate(stroops)}
        >
          {busy ? "İşleniyor…" : valid ? `${amount} XLM Bağışla` : "Tutar gir"}
        </button>
      ) : (
        <button className="btn connect" style={{ width: "100%" }} onClick={onConnect}>
          Bağış için cüzdan bağla
        </button>
      )}

      {address && (
        <div className="you">
          <span>Senin toplam katkın</span>
          <b>{formatXLM(myContribution)} XLM</b>
        </div>
      )}

      {isAdmin && reached && state && !state.withdrawn && (
        <button
          className="btn danger"
          style={{ marginTop: 12 }}
          disabled={busy}
          onClick={onWithdraw}
        >
          Fonu çek ({formatXLM(state.raised)} XLM)
        </button>
      )}
    </div>
  );
}
