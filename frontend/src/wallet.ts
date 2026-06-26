import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule, XBULL_ID } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { NETWORK_PASSPHRASE } from "./config";

// Kit static olarak bir kez init edilir — birden çok cüzdan modülü yüklenir.
StellarWalletsKit.init({
  network: Networks.TESTNET,
  selectedWalletId: XBULL_ID,
  modules: [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new LobstrModule(),
    new RabetModule(),
    new HanaModule(),
  ],
});

/** Cüzdan seçim modalını açar ve seçilen cüzdanın adresini döner. */
export async function connectWallet(): Promise<{ address: string }> {
  const { address } = await StellarWalletsKit.authModal();
  return { address };
}

/** Verilen XDR'ı seçili cüzdanla imzalar. */
export async function signXdr(xdr: string, address: string): Promise<string> {
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    address,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return signedTxXdr;
}

export function disconnectWallet(): Promise<void> {
  return StellarWalletsKit.disconnect();
}
