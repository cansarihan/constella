# StellarFund — Soroban Crowdfunding dApp

> Stellar **Soroban** akıllı kontratı üzerinde çalışan, çoklu cüzdan destekli, **gerçek zamanlı** topluluk fonlama uygulaması. Her bağış zincire yazılır, kontrat event'leri canlı olarak akışa düşer ve ilerleme çubuğu anında güncellenir.

Bu proje **Rise In · Stellar — Level 2 (Yellow Belt)** gereksinimlerini karşılamak için geliştirilmiştir.

---

## 🔗 Önemli Bilgiler (Submission)

| | |
|---|---|
| **Deploy edilmiş kontrat (Testnet)** | [`CCK7G4YW4SYV5BEGMIHWRMXHRXYHIB7PIWEO76H7FLJAYSOK62DKXKBP`](https://stellar.expert/explorer/testnet/contract/CCK7G4YW4SYV5BEGMIHWRMXHRXYHIB7PIWEO76H7FLJAYSOK62DKXKBP) |
| **Örnek `donate` işlem hash'i** | [`1cec7bd53c1e99840bfd50880c3ec4e0e7affba2b2d7ba9fd237741efc50a3d8`](https://stellar.expert/explorer/testnet/tx/1cec7bd53c1e99840bfd50880c3ec4e0e7affba2b2d7ba9fd237741efc50a3d8) |
| **Deploy işlem hash'i** | [`97a82189ec0f2d7f12ad6262cf98292a23f1be31e67d62d8ec1f9b5e04e0314a`](https://stellar.expert/explorer/testnet/tx/97a82189ec0f2d7f12ad6262cf98292a23f1be31e67d62d8ec1f9b5e04e0314a) |
| **Ağ** | Stellar Testnet · Soroban RPC |
| **Bağış token'ı** | Native XLM (Stellar Asset Contract) |
| **Live demo** | _(opsiyonel — Vercel/Netlify'a deploy edilirse buraya eklenecek)_ |

---

## 📸 Ekran Görüntüleri

### Mevcut cüzdan seçenekleri (çoklu cüzdan)
StellarWalletsKit ile Freighter, xBull, Albedo, LOBSTR, Rabet ve Hana desteklenir:

![Cüzdan seçenekleri](docs/screenshots/wallets.png)

### Ana ekran — canlı ilerleme & bağış akışı
![Uygulama](docs/screenshots/app.png)

---

## ✨ Özellikler

- **Çoklu cüzdan entegrasyonu** — `StellarWalletsKit` ile tek modaldan Freighter / xBull / Albedo / LOBSTR / Rabet / Hana bağlama.
- **Akıllı kontrattan okuma & yazma** — `donate`, `withdraw`, `get_state`, `get_contribution`.
- **Gerçek zamanlı event senkronizasyonu** — Soroban RPC `getEvents` ile `DonationEvent` polling; yeni bağışlar animasyonlu olarak akışa düşer ve ilerleme çubuğu canlı güncellenir.
- **İşlem durumu takibi** — her işlem için `Hazırlanıyor → İmza → Zincire gönderildi → Başarılı/Hata` adımları ve doğrulanabilir explorer linki.
- **3+ hata tipi yakalama** (aşağıdaki tablo).
- **Animasyonlu, glassmorphism arayüz** — Framer Motion ile yumuşak geçişler, aurora arka plan, shimmer'lı progress bar.

---

## 🧯 Yakalanan Hata Tipleri

| Senaryo | Nereden gelir | Kullanıcıya gösterilen |
|---|---|---|
| **Cüzdan bulunamadı** | Seçilen cüzdan kurulu/etkin değil | "Cüzdan bulunamadı — kur ve tekrar dene" |
| **Kullanıcı reddetti** | İmza penceresinde iptal | "İşlem reddedildi" |
| **Yetersiz bakiye** | XLM yetersiz / underfunded | "Yetersiz bakiye" |
| **Geçersiz tutar** | Kontrat `InvalidAmount` (`#3`) | "Bağış tutarı 0'dan büyük olmalı" |
| **Süre doldu** | Kontrat `DeadlinePassed` (`#4`) | "Kampanyanın son tarihi geçti" |
| **Hedefe ulaşılmadı** | Kontrat `GoalNotReached` (`#5`) | "Hedefe ulaşılmadan fon çekilemez" |

Hata eşleme mantığı: [`frontend/src/stellar.ts → parseError()`](frontend/src/stellar.ts).

---

## 🏗️ Mimari

```text
.
├── contracts/crowdfunding/        # Soroban akıllı kontrat (Rust)
│   ├── src/lib.rs                 # initialize / donate / withdraw / get_state / get_contribution
│   └── src/test.rs                # 7 birim testi (hata yolları dahil)
├── frontend/                      # React + Vite + TypeScript dApp
│   └── src/
│       ├── wallet.ts              # StellarWalletsKit (çoklu cüzdan)
│       ├── stellar.ts             # kontrat çağrıları + event polling + hata eşleme
│       ├── hooks/useCampaign.ts   # state & event gerçek zamanlı senkronizasyonu
│       └── components/            # CampaignCard, DonatePanel, ActivityFeed, TxStatusModal...
├── scripts/deploy.sh              # tek komutla deploy + initialize
└── README.md
```

### Akıllı kontrat fonksiyonları

| Fonksiyon | Tip | Açıklama |
|---|---|---|
| `initialize(admin, token, title, goal, deadline)` | write | Kampanyayı kurar |
| `donate(donor, amount)` | write | Token'ı bağışçıdan kontrata aktarır, `DonationEvent` yayar |
| `withdraw()` | write | Hedefe ulaşıldıysa fonu admin'e aktarır (`WithdrawEvent`) |
| `get_state()` | read | Hedef, toplanan, bağışçı sayısı, son tarih, durum |
| `get_contribution(donor)` | read | Bir adresin toplam bağışı |

---

## 🚀 Kurulum

### Önkoşullar
- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) + `wasm32v1-none` hedefi
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli) 23+
- Tarayıcıda bir Stellar cüzdanı (örn. [Freighter](https://www.freighter.app/)) — Testnet modunda

### 1) Frontend'i çalıştır
```bash
cd frontend
npm install
cp .env.example .env     # opsiyonel — varsayılan kontrat zaten gömülü
npm run dev
```
Uygulama `http://localhost:5173` adresinde açılır. Kontrat zaten testnet'e deploy edilmiş olduğu için **ek kuruluma gerek kalmadan** çalışır.

### 2) (Opsiyonel) Kontratı kendin deploy et
```bash
# kontrat testleri
cargo test -p crowdfunding

# tek komutla derle + deploy + initialize (funded testnet kimliği oluşturur)
./scripts/deploy.sh

# çıktıdaki CONTRACT_ID'yi frontend/.env içine yaz:
#   VITE_CONTRACT_ID=<yeni_id>
```

### 3) Cüzdana testnet XLM al
[Freighter](https://www.freighter.app/) → ağı **Testnet** yap → "Fund with Friendbot" ile bakiye yükle, sonra uygulamadan bağış yap.

---

## 🔄 Gerçek zamanlı akış nasıl çalışır?

1. Kullanıcı bağış yapar → `donate` çağrısı simüle edilir (auth + `prepareTransaction`).
2. İşlem cüzdanda imzalanır ve ağa gönderilir; durum `pending → success` olarak takip edilir.
3. Kontrat `DonationEvent { donor, amount, total_raised }` yayar.
4. Frontend `getEvents`'i 4 sn'de bir cursor ile yoklar; yeni event'ler **canlı akışa** animasyonla düşer ve `get_state` tazelenerek ilerleme çubuğu güncellenir.

---

## ✅ Level 2 Gereksinim Kontrolü

- [x] Çoklu cüzdan entegrasyonu (StellarWalletsKit)
- [x] 3+ hata tipi yakalandı
- [x] Kontrat testnet'e deploy edildi
- [x] Kontrat frontend'den çağrıldı
- [x] İşlem durumu görünür (pending/success/fail)
- [x] Gerçek zamanlı event entegrasyonu
- [x] 2+ anlamlı commit

---

## 🛠️ Teknolojiler
Rust · Soroban SDK 25 · Stellar CLI · React 19 · Vite · TypeScript · @stellar/stellar-sdk · @creit.tech/stellar-wallets-kit · Framer Motion
