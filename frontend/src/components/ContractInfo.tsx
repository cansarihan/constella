import { CONTRACT_ID, EXPLORER_CONTRACT } from "../config";
import { shortAddr } from "../format";

export function ContractInfo({ admin }: { admin?: string }) {
  return (
    <div className="card contract-info">
      <div className="kv">
        <span>Smart Contract (Testnet)</span>
        <a href={EXPLORER_CONTRACT(CONTRACT_ID)} target="_blank" rel="noreferrer">
          {shortAddr(CONTRACT_ID, 8)} ↗
        </a>
      </div>
      {admin && (
        <div className="kv">
          <span>Campaign owner</span>
          <a
            href={`https://stellar.expert/explorer/testnet/account/${admin}`}
            target="_blank"
            rel="noreferrer"
          >
            {shortAddr(admin, 6)} ↗
          </a>
        </div>
      )}
      <div className="kv">
        <span>Network</span>
        <a href="https://soroban-testnet.stellar.org" target="_blank" rel="noreferrer">
          Soroban RPC · Testnet
        </a>
      </div>
    </div>
  );
}
