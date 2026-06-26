import { AnimatePresence, motion } from "framer-motion";
import type { TxState } from "../types";
import { EXPLORER_TX } from "../config";
import { shortAddr } from "../format";

const STEPS: { key: string; label: string }[] = [
  { key: "building", label: "İşlem hazırlanıyor & simüle ediliyor" },
  { key: "signing", label: "Cüzdanda imza bekleniyor" },
  { key: "pending", label: "Zincire gönderildi, onaylanıyor" },
];

const order = ["building", "signing", "pending"];

export function TxStatusModal({
  tx,
  onClose,
}: {
  tx: TxState;
  onClose: () => void;
}) {
  const open = tx.phase !== "idle";
  const activeIdx = order.indexOf(tx.phase);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="card tx-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            {tx.phase === "success" ? (
              <>
                <motion.div
                  className="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                >
                  ✓
                </motion.div>
                <h3>Bağış başarılı!</h3>
                <p>İşlemin Stellar testnet'te onaylandı.</p>
                {tx.hash && (
                  <a className="tx-hash" href={EXPLORER_TX(tx.hash)} target="_blank" rel="noreferrer">
                    {shortAddr(tx.hash, 8)} ↗
                  </a>
                )}
                <button className="btn" style={{ marginTop: 22 }} onClick={onClose}>
                  Kapat
                </button>
              </>
            ) : tx.phase === "error" ? (
              <>
                <motion.div
                  className="cross"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                >
                  ✕
                </motion.div>
                <h3>İşlem tamamlanamadı</h3>
                <p>{tx.message}</p>
                <button className="btn ghost" style={{ width: "100%" }} onClick={onClose}>
                  Kapat
                </button>
              </>
            ) : (
              <>
                <div className="spinner" />
                <h3>İşlem sürüyor</h3>
                <p>Lütfen bekle — adımlar aşağıda.</p>
                <div className="tx-steps">
                  {STEPS.map((s, i) => {
                    const cls =
                      i < activeIdx ? "step done" : i === activeIdx ? "step active" : "step";
                    return (
                      <div className={cls} key={s.key}>
                        <span className="b">{i < activeIdx ? "✓" : i + 1}</span>
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
