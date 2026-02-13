# Token Operations

Buy, sell, transfer, burn tokens, and claim creator royalties on Bags.fm / Solana.

## Why this matters

- **Buy** your token to show conviction.
- **Sell** for treasury management.
- **Transfer** to contributors/community.
- **Burn** to reduce supply (irreversible).
- **Claim royalties** (1% creator fee from token trading volume).

## Setup

Dependencies:

```bash
npm install @solana/web3.js @solana/spl-token bs58
```

Initialization:

```javascript
const { Connection, Keypair, Transaction, PublicKey, VersionedTransaction } = require("@solana/web3.js");
const {
  createBurnInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} = require("@solana/spl-token");
const bs58 = require("bs58").default;

const connection = new Connection("https://api.mainnet-beta.solana.com");
const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
```

API:
- Bags API base: `https://public-api-v2.bags.fm/api/v1`
- Header for Bags: `x-api-key: {BAGS_API_KEY}`
- Dexscreener price API: `https://api.dexscreener.com/latest/dex/tokens/{TOKEN_MINT}`

---

## Section A — Buy / Sell

### Check price

```bash
curl "https://api.dexscreener.com/latest/dex/tokens/{TOKEN_MINT}"
```

Useful fields:
- `pairs[0].priceUsd`
- `pairs[0].marketCap` / `pairs[0].fdv`
- `pairs[0].volume.h24`

### Buy (SOL -> TOKEN)

1. Quote

```bash
curl "https://public-api-v2.bags.fm/api/v1/trade/quote?inputMint=So11111111111111111111111111111111111111112&outputMint={TOKEN_MINT}&amount={LAMPORTS}&slippageMode=auto" \
  -H "x-api-key: {BAGS_API_KEY}"
```

2. Swap tx

```bash
curl -X POST "https://public-api-v2.bags.fm/api/v1/trade/swap" \
  -H "x-api-key: {BAGS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteResponse": { ...quote_response... },
    "userPublicKey": "{WALLET_ADDRESS}"
  }'
```

3. Sign + submit

```javascript
const tx = VersionedTransaction.deserialize(bs58.decode(swapTransaction));
tx.sign([keypair]);
const signed = bs58.encode(tx.serialize());
// POST /solana/send-transaction { "transaction": signed }
```

### Sell (TOKEN -> SOL)

Same flow as buy, but reverse mints:

```bash
curl "https://public-api-v2.bags.fm/api/v1/trade/quote?inputMint={TOKEN_MINT}&outputMint=So11111111111111111111111111111111111111112&amount={RAW_TOKEN_AMOUNT}&slippageMode=auto" \
  -H "x-api-key: {BAGS_API_KEY}"
```

Then call `/trade/swap`, sign, and send.

---

## Section B — Transfer / Burn

### Transfer tokens

```javascript
const mint = new PublicKey("{TOKEN_MINT}");
const recipient = new PublicKey("{RECIPIENT_WALLET}");

const fromAta = await getAssociatedTokenAddress(mint, keypair.publicKey);
const toAta = await getAssociatedTokenAddress(mint, recipient);
const tx = new Transaction();

try { await getAccount(connection, toAta); } catch {
  tx.add(createAssociatedTokenAccountInstruction(
    keypair.publicKey, toAta, recipient, mint
  ));
}

const amount = BigInt(5000000) * BigInt(1e9); // example with 9 decimals
tx.add(createTransferInstruction(fromAta, toAta, keypair.publicKey, amount));
```

### Burn tokens

```javascript
const mint = new PublicKey("{TOKEN_MINT}");
const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
const amount = BigInt(100000) * BigInt(1e9); // example with 9 decimals

const tx = new Transaction().add(
  createBurnInstruction(ata, mint, keypair.publicKey, amount)
);
```

Burn is irreversible. Double-check amount before signing.

### Claim creator royalties

1. Check claimable:

```bash
curl "https://public-api-v2.bags.fm/api/v1/token-launch/claimable-positions?wallet={WALLET_ADDRESS}" \
  -H "x-api-key: {BAGS_API_KEY}"
```

2. Build claim tx:

```bash
curl -X POST "https://public-api-v2.bags.fm/api/v1/token-launch/claim-txs/v3" \
  -H "x-api-key: {BAGS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "feeClaimer": "{WALLET_ADDRESS}",
    "tokenMint": "{TOKEN_MINT}"
  }'
```

3. Sign + send via `/solana/send-transaction`.

---

## Quick Reference

| Operation | Bags API | On-chain |
|---|---|---|
| Buy | quote -> swap -> send-transaction | VersionedTransaction |
| Sell | quote -> swap -> send-transaction | VersionedTransaction |
| Transfer | — | SPL createTransferInstruction |
| Burn | — | SPL createBurnInstruction |
| Claim fees | claimable-positions -> claim-txs/v3 -> send-transaction | VersionedTransaction |

## Notes

- `1 SOL = 1,000,000,000 lamports`
- For 9-dec token: `1 token = 1,000,000,000 raw units`
- Keep some SOL for tx fees (~0.01 SOL)
- Track tx signatures on `https://solscan.io/tx/{signature}`
