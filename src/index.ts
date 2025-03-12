import { Connection, PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { getTokenAccounts } from "./config/getAmount";

// Load environment variables
dotenv.config();

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const SOLANA_WALLET1_ADDRESS = process.env.SOLANA_WALLET1_ADDRESS || "";
const SOLANA_WALLET2_ADDRESS = process.env.SOLANA_WALLET2_ADDRESS || "";

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

// Initialize Telegram bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Solana connection
const rpcEndpoint = process.env.QUIKNODE_RPC || "";

console.log(`rpcEndpoint: ${rpcEndpoint}`);

const connection = new Connection(rpcEndpoint, "confirmed");

// Public key of the wallet to monitor

async function checkTransactions() {
  try {
    let res1 = await getTokenAccounts(SOLANA_WALLET1_ADDRESS, connection);
    let res2 = await getTokenAccounts(SOLANA_WALLET2_ADDRESS, connection);

    let message =
      "res1 result is:" +
      JSON.stringify(res1) +
      "\n" +
      "res2 result is:" +
      JSON.stringify(res2);

    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error checking transactions:", error);
  }
}

// Run the check every 10 seconds
setInterval(checkTransactions, 10 * 1000);

// Start the bot
bot.launch().then(() => console.log("Telegram bot started! 🚀"));
