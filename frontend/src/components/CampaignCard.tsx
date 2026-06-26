import { motion } from "framer-motion";
import type { CampaignState } from "../types";
import { formatXLM, pct, timeLeft } from "../format";

export function CampaignCard({ state }: { state: CampaignState | null }) {
  if (!state) {
    return (
      <div className="card campaign">
        <div className="skeleton" style={{ height: 18, width: 120, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 34, width: "70%", marginBottom: 18 }} />
        <div className="skeleton" style={{ height: 14, width: "100%", marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 70, width: "100%" }} />
      </div>
    );
  }

  const progress = pct(state.raised, state.goal);
  const reached = state.raised >= state.goal;

  return (
    <div className="card campaign">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="eyebrow">Stellar Testnet · Soroban</div>
        {state.withdrawn ? (
          <span className="badge done">✓ Funds withdrawn</span>
        ) : reached ? (
          <span className="badge done">🎯 Goal reached</span>
        ) : (
          <span className="badge live">
            <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />
            Live
          </span>
        )}
      </div>

      <h1>{state.title}</h1>
      <div className="sub">
        Transparent, on-chain, real-time community funding. Every donation is written
        to the smart contract and reflected instantly for everyone.
      </div>

      <div className="stat-row">
        <motion.span
          className="raised"
          key={state.raised.toString()}
          initial={{ scale: 0.92, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          {formatXLM(state.raised)} XLM
        </motion.span>
        <span className="goal">/ {formatXLM(state.goal, 0)} XLM goal</span>
      </div>

      <div className="progress">
        <motion.div
          className="fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <div className="progress-meta">
        <span>
          <b>{progress.toFixed(1)}%</b> funded
        </span>
        <span>{timeLeft(state.deadline)}</span>
      </div>

      <div className="pills">
        <div className="pill">
          <div className="k">Backers</div>
          <div className="v">{state.contributors}</div>
        </div>
        <div className="pill">
          <div className="k">Raised</div>
          <div className="v">{formatXLM(state.raised)} XLM</div>
        </div>
        <div className="pill">
          <div className="k">Remaining</div>
          <div className="v">
            {formatXLM(state.raised >= state.goal ? 0n : state.goal - state.raised)} XLM
          </div>
        </div>
      </div>
    </div>
  );
}
