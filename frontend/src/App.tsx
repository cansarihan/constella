import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CampaignCard } from "./components/CampaignCard";
import { DonatePanel } from "./components/DonatePanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { TxStatusModal } from "./components/TxStatusModal";
import { ContractInfo } from "./components/ContractInfo";
import { useCampaign } from "./hooks/useCampaign";
import { connectWallet, signXdr } from "./wallet";
import {
  buildDonateTx,
  buildWithdrawTx,
  parseError,
  readContribution,
  submitSigned,
  type FriendlyError,
} from "./stellar";
import type { TxState } from "./types";
import { shortAddr } from "./format";

interface Toast extends FriendlyError {
  id: number;
}

let toastSeq = 0;

export default function App() {
  const { state, activities, newActivityId, refreshState } = useCampaign();
  const [address, setAddress] = useState<string | null>(
    () => localStorage.getItem("sf_address")
  );
  const [myContribution, setMyContribution] = useState<bigint>(0n);
  const [tx, setTx] = useState<TxState>({ phase: "idle" });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const busy = ["building", "signing", "pending"].includes(tx.phase);
  const isAdmin = !!address && !!state && address === state.admin;

  const pushToast = useCallback((fe: FriendlyError) => {
    const t: Toast = { ...fe, id: ++toastSeq };
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 5000);
  }, []);

  const loadContribution = useCallback(async (addr: string) => {
    try {
      setMyContribution(await readContribution(addr));
    } catch {
      setMyContribution(0n);
    }
  }, []);

  useEffect(() => {
    if (address) loadContribution(address);
  }, [address, activities, loadContribution]);

  const handleConnect = useCallback(async () => {
    try {
      const { address: addr } = await connectWallet();
      setAddress(addr);
      localStorage.setItem("sf_address", addr);
      loadContribution(addr);
    } catch (e) {
      const fe = parseError(e);
      if (fe.kind !== "modal_closed") pushToast(fe);
    }
  }, [loadContribution, pushToast]);

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setMyContribution(0n);
    localStorage.removeItem("sf_address");
  }, []);

  const handleDonate = useCallback(
    async (amountStroops: bigint) => {
      if (!address) return;
      setTx({ phase: "building" });
      try {
        const xdr = await buildDonateTx(address, amountStroops);
        setTx({ phase: "signing" });
        const signed = await signXdr(xdr, address);
        setTx({ phase: "pending" });
        const hash = await submitSigned(signed);
        setTx({ phase: "success", hash });
        refreshState();
        loadContribution(address);
      } catch (e) {
        const fe = parseError(e);
        setTx({ phase: "error", message: `${fe.title} — ${fe.message}` });
        pushToast(fe);
      }
    },
    [address, refreshState, loadContribution, pushToast]
  );

  const handleWithdraw = useCallback(async () => {
    if (!address) return;
    setTx({ phase: "building" });
    try {
      const xdr = await buildWithdrawTx(address);
      setTx({ phase: "signing" });
      const signed = await signXdr(xdr, address);
      setTx({ phase: "pending" });
      const hash = await submitSigned(signed);
      setTx({ phase: "success", hash });
      refreshState();
    } catch (e) {
      const fe = parseError(e);
      setTx({ phase: "error", message: `${fe.title} — ${fe.message}` });
      pushToast(fe);
    }
  }, [address, refreshState, pushToast]);

  return (
    <>
      <div className="aurora" />

      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="logo">✦</div>
            <div>
              StellarFund <span className="dim">/ crowdfund</span>
            </div>
          </div>
          <div className="topbar-right">
            <span className="net-badge">
              <span className="dot" />
              Testnet
            </span>
            {address ? (
              <div className="addr-chip" title={address}>
                <span className="av" />
                {shortAddr(address, 4)}
                <small onClick={handleDisconnect}>Çıkış</small>
              </div>
            ) : (
              <button className="btn connect" onClick={handleConnect}>
                Cüzdan bağla
              </button>
            )}
          </div>
        </header>

        <main className="grid">
          <CampaignCard state={state} />
          <DonatePanel
            state={state}
            address={address}
            myContribution={myContribution}
            busy={busy}
            isAdmin={isAdmin}
            onConnect={handleConnect}
            onDonate={handleDonate}
            onWithdraw={handleWithdraw}
          />
        </main>

        <ActivityFeed activities={activities} newId={newActivityId} />
        <ContractInfo admin={state?.admin} />
      </div>

      <TxStatusModal tx={tx} onClose={() => setTx({ phase: "idle" })} />

      <div className="toast-wrap">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className="toast error"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
            >
              <div className="ic">⚠️</div>
              <div>
                <div className="tt">{t.title}</div>
                <div className="tm">{t.message}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
