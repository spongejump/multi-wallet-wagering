import { Connection } from "@solana/web3.js";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { trackTokenTransfer } from "./config/track";

// Load environment variables
dotenv.config();

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID || "";
const SOLANA_WALLETS: string[] = [
  process.env.SOLANA_WALLET1_ADDRESS || "",
  process.env.SOLANA_WALLET2_ADDRESS || "",
].filter(Boolean) as string[]; // Ensure valid wallets
const TOKEN_MINT_ADDRESS: string = process.env.TOKEN_MINT_ADDRESS || "";
const RPC_URL: string = process.env.QUIKNODE_RPC || "";

if (
  !TELEGRAM_BOT_TOKEN ||
  !TELEGRAM_CHAT_ID ||
  !SOLANA_WALLETS.length ||
  !TOKEN_MINT_ADDRESS
) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
// const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const connection = new Connection(RPC_URL, "confirmed");
console.log(`✅ Connected to RPC`);

async function startTracking() {
  for (const wallet of SOLANA_WALLETS) {
    trackTokenTransfer(wallet, TOKEN_MINT_ADDRESS, connection)
      .then((result) => {
        if (
          typeof result === "object" &&
          result !== null &&
          "sendTokenAmount" in result &&
          "tokenSender" in result
        ) {
          const { sendTokenAmount, tokenSender } = result as {
            sendTokenAmount: number;
            tokenSender: string;
          };
          if (sendTokenAmount > 0 && tokenSender) {
            const message = `🚀 *New Transfer Detected!*
📤 *Sender:* [${tokenSender}](https://solscan.io/account/${tokenSender})
📩 *Receiver:* [${wallet}](https://solscan.io/account/${wallet})
💰 *Amount:*  ${sendTokenAmount} $VS tokens`;

            bot.telegram
              .sendMessage(TELEGRAM_CHAT_ID, message, {
                parse_mode: "Markdown",
              })
              .then(() => console.log("✅ Notification sent to Telegram!"))
              .catch((err) => console.error("❌ Telegram Error:", err));
          }
        } else {
          console.error(
            "❌ Unexpected result format from trackTokenTransfer",
            result
          );
        }
      })
      .catch((err) => console.error("❌ Tracking Error:", err));
  }
}

startTracking();

bot
  .launch()
  .then(() => console.log("🤖 Telegram bot started successfully! 🚀"));
