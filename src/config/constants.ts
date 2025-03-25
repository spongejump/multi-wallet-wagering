import dotenv from "dotenv";
dotenv.config();

export const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || "";
export const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID || "";
export const THREAD_ID = process.env.TELEGRAM_THREAD_ID
  ? parseInt(process.env.TELEGRAM_THREAD_ID)
  : null;
export const TOKEN_MINT_ADDRESS: string = process.env.TOKEN_MINT_ADDRESS || "";
export const ADMIN_PRIVATE_KEY: string = process.env.ADMIN_PRIVATE_KEY || "";
export const RPC_URL: string = process.env.QUIKNODE_RPC || "";

export const SOLANA_WALLETS: string[] = [];
export const EVENT_NAMES: string[] = [];
export const EVENT_TITLES: string[] = [];

// Solana Configuration
export const SOL_RECEIVER =
  process.env.SOL_RECEIVER || "F5ojBQNvSzM3TCNCwj1mGd4qxsuGP2XizRNLRKzRpJd3";
export const VS_TOKEN_MINT =
  process.env.VS_TOKEN_MINT || "D7wHZsj4MdNDuuLznrxut4kPztjMcKJ21nPzGe6Qn3MU";
export const VS_TOKEN_DECIMALS = Number(process.env.VS_TOKEN_DECIMALS) || 9;

// API Endpoints
export const KRAKEN_API_URL =
  process.env.KRAKEN_API_URL ||
  "https://api.kraken.com/0/public/Ticker?pair=SOLUSD";
