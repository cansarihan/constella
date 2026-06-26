import { AnimatePresence, motion } from "framer-motion";
import type { DonationActivity } from "../types";
import { EXPLORER_ACCOUNT } from "../config";
import { formatXLM, relativeTime, shortAddr } from "../format";

export function ActivityFeed({
  activities,
  newId,
}: {
  activities: DonationActivity[];
  newId: string | null;
}) {
  return (
    <div className="card feed">
      <div className="feed-head">
        <h3>Live donation feed</h3>
        <span className="badge live">
          <span
            className="dot"
            style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }}
          />
          Real-time
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="empty">
          No donations yet — be the first to back this campaign! New donations stream
          in here instantly from contract events.
        </div>
      ) : (
        <div className="feed-list">
          <AnimatePresence initial={false}>
            {activities.map((a) => (
              <motion.a
                key={a.id}
                href={EXPLORER_ACCOUNT(a.donor)}
                target="_blank"
                rel="noreferrer"
                className="feed-item"
                style={{ textDecoration: "none", color: "inherit" }}
                initial={{ opacity: 0, y: -14, scale: 0.97 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  boxShadow:
                    a.id === newId
                      ? "0 0 0 1px rgba(42,245,152,0.5)"
                      : "0 0 0 0 rgba(0,0,0,0)",
                }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                <div className="ico">💚</div>
                <div className="who">
                  <div className="a">{shortAddr(a.donor, 6)}</div>
                  <div className="t">{relativeTime(a.at)} · ledger #{a.ledger}</div>
                </div>
                <div className="amt">+{formatXLM(a.amount)} XLM</div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
