import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
// import { trackTokenTransfer } from "./config/track";

// Load environment variables
dotenv.config();

const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID || "";
const THREAD_ID = process.env.TELEGRAM_THREAD_ID
  ? parseInt(process.env.TELEGRAM_THREAD_ID)
  : null;
const SOLANA_WALLETS: string[] = [
  // process.env.SOLANA_WALLET1_ADDRESS || "",
  // process.env.SOLANA_WALLET2_ADDRESS || "",
  // process.env.SOLANA_WALLET3_ADDRESS || "",
  // process.env.SOLANA_WALLET4_ADDRESS || "",
].filter(Boolean) as string[]; // Ensure valid wallets

const EVENT_NAMES: string[] = [
  // "Yes",
  // "No",
  // "Sacramento Kings",
  // "Golden State Warriors",
];

const EVENT_TITLES: string[] = [
  // "GTA 6 vs 2025 Release",
  // "Sacramento Kings vs. Golden State Warriors - 3/13",
];

const TOKEN_MINT_ADDRESS: string = process.env.TOKEN_MINT_ADDRESS || "";
const RPC_URL: string = process.env.QUIKNODE_RPC || "";

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TOKEN_MINT_ADDRESS) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

const userSessions = new Map<string, any>();
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
// const connection = new Connection(RPC_URL, "confirmed");
console.log(`✅ Connected to RPC`);

async function getNumberDecimals(
  mintAddress: string,
  connection: Connection
): Promise<number> {
  const info = await connection.getParsedAccountInfo(
    new PublicKey(mintAddress)
  );
  const result = (info.value?.data as ParsedAccountData).parsed.info
    .decimals as number;
  return result;
}

async function trackTokenTransfer(
  mainWalletAddress: string,
  tokenMintAddress: string,
  connection: Connection,
  index: number
) {
  let sendTokenAmount = 0;
  let tokenSender = "";

  const mainWalletPubKey = new PublicKey(mainWalletAddress);
  const tokenMintPubKey = new PublicKey(tokenMintAddress);

  const associatedTokenAddress = getAssociatedTokenAddressSync(
    tokenMintPubKey,
    mainWalletPubKey
  );

  let previousBalance = await getTokenBalance(); // Start with the current balance

  async function getTokenBalance() {
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    if (accountInfo && accountInfo.data) {
      const decoded = AccountLayout.decode(accountInfo.data);
      return Number(decoded.amount);
    }
    return 0;
  }

  // Fetch token decimals
  const tokenDecimals = await getNumberDecimals(tokenMintAddress, connection);

  connection.onAccountChange(
    associatedTokenAddress,
    async (updatedAccountInfo) => {
      if (updatedAccountInfo.data) {
        const decoded = AccountLayout.decode(updatedAccountInfo.data);
        const newBalance = Number(decoded.amount);
        const tokenChange = newBalance - previousBalance;

        // if (tokenChange > 0) {
        sendTokenAmount = Math.abs(tokenChange) / Math.pow(10, tokenDecimals); // Adjusting for decimals

        // Get the transaction signature to identify the sender
        const confirmedSignatures = await connection.getSignaturesForAddress(
          associatedTokenAddress,
          {
            limit: 1,
          }
        );
        if (confirmedSignatures.length > 0) {
          const txSignature = confirmedSignatures[0].signature;
          const txDetails = await connection.getTransaction(txSignature, {
            commitment: "confirmed",
          });

          if (
            txDetails &&
            txDetails.transaction &&
            txDetails.transaction.message
          ) {
            const senderPubKey =
              txDetails.transaction.message.accountKeys[0].toBase58();
            tokenSender = senderPubKey;
          }
        }

        previousBalance = newBalance;
        console.log(
          `sendTokenAmount, tokenSender: ${sendTokenAmount}, ${tokenSender}`
        );

        // Handle your message logic here, keep it within the event listener
        let message = "";

        console.log(`index is ${index}`);

        const isFromPairedWallet =
          (index % 2 === 0 && tokenSender === SOLANA_WALLETS[index + 1]) ||
          (index % 2 === 1 && tokenSender === SOLANA_WALLETS[index - 1]);

        if (isFromPairedWallet) {
          message = `📢 *Wager End Alert*\n\n🎲 A winner of *${
            EVENT_TITLES[Math.floor(index / 2)]
          }*  is *${EVENT_NAMES[index]}* wallet;`;
          bot.telegram
            .sendMessage(TELEGRAM_CHAT_ID, message, {
              parse_mode: "Markdown",
              ...(THREAD_ID ? { message_thread_id: THREAD_ID } : {}),
            })
            .then(() =>
              console.log(`✅ Notification sent for wallet ${index + 1}!`)
            )
            .catch((err) => console.error("❌ Telegram Error:", err));
        } else if (
          sendTokenAmount > 0 &&
          SOLANA_WALLETS.indexOf(tokenSender) < 0
        ) {
          message = `📢 **Token Transfer Alert**
          
      🔹 **Sender:** [${tokenSender}](https://solscan.io/account/${tokenSender})  
      🔹 **Receiver:** [Wallet ${
        index + 1
      }](https://solscan.io/account/${mainWalletAddress})  
      💰 **Amount Transferred:** ${sendTokenAmount} $VS\
      
      🔎 *Click the wallet addresses to view transaction details on Solscan.*`;

          bot.telegram
            .sendMessage(TELEGRAM_CHAT_ID, message, {
              parse_mode: "Markdown",
              ...(THREAD_ID ? { message_thread_id: THREAD_ID } : {}),
            })
            .then(() =>
              console.log(`✅ Notification sent for wallet ${index + 1}!`)
            )
            .catch((err) => console.error("❌ Telegram Error:", err));
        }
        await saveTokenTransfer(
          mainWalletAddress,
          tokenSender,
          sendTokenAmount
        );
      }
    }
  );
}

function saveTokenTransfer(
  wallet: string,
  sender: string,
  amount: number
): void {
  try {
    const filePath = "data.json";

    // Read existing data or initialize empty object
    let data: Record<string, Record<string, number>> = {};

    if (fs.existsSync(filePath)) {
      try {
        const rawData = fs.readFileSync(filePath, "utf8");
        data = JSON.parse(rawData);
      } catch (error) {
        console.error(
          "Error reading or parsing JSON file. Resetting data.json.",
          error
        );
        data = {}; // Reset to avoid crashes if file is corrupted
      }
    }

    // Ensure wallet entry exists
    if (!data[wallet]) {
      data[wallet] = {};
    }

    // Update sender's amount
    data[wallet][sender] = (data[wallet][sender] || 0) + amount;

    // Atomic write to prevent corruption
    fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) console.error("Error saving token transfer:", err);
    });
  } catch (error) {
    console.error("Error saving token transfer:", error);
  }
}

async function startTracking() {
  for (let index = 0; index < SOLANA_WALLETS.length; index++) {
    const wallet = SOLANA_WALLETS[index];
    // Call trackTokenTransfer and pass index to know which wallet is being tracked
    trackTokenTransfer(wallet, TOKEN_MINT_ADDRESS, connection, index);
  }
}

startTracking();

bot.command("create_event", (ctx) => {
  if (ctx.chat.type !== "private") {
    return;
  }

  userSessions.set(ctx.from.id.toString(), { step: "waiting_for_photo" }); // Start a new session
  ctx.reply(
    "📸 Please upload or paste an image to proceed with the event creation."
  );
});

bot.on("photo", (ctx) => {
  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);

  if (!session || session.step !== "waiting_for_photo") {
    return;
  }

  try {
    const photoArray = ctx.message.photo;
    if (!photoArray || photoArray.length === 0) {
      return ctx.reply("⚠️ No image detected. Please try again.");
    }

    const photoId = photoArray[photoArray.length - 1].file_id;
    console.log("📸 Received photo ID:", photoId);

    // Store photo in session
    session.photoId = photoId;
    session.step = "waiting_for_title"; // Move to next step
    userSessions.set(userId, session);

    ctx
      .replyWithPhoto(photoId, { caption: "✅ Image uploaded!" })
      .then(() => ctx.reply("📝 Input wager title:"));
  } catch (error) {
    console.error("❌ Error processing image:", error);
    ctx.reply(
      "⚠️ An error occurred while processing your image. Please try again."
    );
  }
});

bot.on("text", (ctx) => {
  if (ctx.chat.type !== "private") {
    return;
  }

  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);

  if (!session) {
    return ctx.reply("⚠️ Please start by using /create_event.");
  }

  switch (session.step) {
    case "waiting_for_title":
      session.title = ctx.message.text;
      EVENT_TITLES.push(session.title);
      session.step = "waiting_for_wager1";
      userSessions.set(userId, session);
      ctx.reply("🏆 Input wager1 name:");
      break;

    case "waiting_for_wager1":
      session.wager1 = ctx.message.text;
      EVENT_NAMES.push(session.wager1);
      session.step = "waiting_for_wager1Wallet";
      userSessions.set(userId, session);
      ctx.reply("💰 Input wager1 Solana wallet address:");
      break;

    case "waiting_for_wager1Wallet":
      session.wager1Wallet = ctx.message.text;
      SOLANA_WALLETS.push(session.wager1Wallet);
      session.step = "waiting_for_wager2";
      userSessions.set(userId, session);
      ctx.reply("⚽ Input wager2 name:");
      break;

    case "waiting_for_wager2":
      session.wager2 = ctx.message.text;
      EVENT_NAMES.push(session.wager2);
      session.step = "waiting_for_wager2Wallet";
      userSessions.set(userId, session);
      ctx.reply("💰 Input wager2 Solana wallet address:");
      break;

    case "waiting_for_wager2Wallet":
      session.wager2Wallet = ctx.message.text;
      SOLANA_WALLETS.push(session.wager2Wallet);
      session.step = "waiting_for_prediction";
      userSessions.set(userId, session);
      ctx.reply("📜 Input wager prediction:");
      break;

    case "waiting_for_prediction":
      session.prediction = ctx.message.text;
      userSessions.set(userId, session);

      // Send final output to the group with a thread ID
      bot.telegram
        .sendPhoto(TELEGRAM_CHAT_ID, session.photoId, {
          caption: `🎉 **New Wager ALERT!** 🎉
      
📌 **Title:** ${session.title}

🔹 **Wager 1:** ${session.wager1}
💰 **Wallet:** \`${session.wager1Wallet}\`

🔹 **Wager 2:** ${session.wager2}
💰 **Wallet:** \`${session.wager2Wallet}\`

📜 **Prediction:** ${session.prediction}`,
          parse_mode: "Markdown",
          ...(THREAD_ID ? { message_thread_id: THREAD_ID } : {}),
        })
        .then(() => ctx.reply("✅ Wager created successfully!"))
        .catch((err) => {
          console.error("❌ Error sending wager to group:", err);
          ctx.reply("⚠️ Failed to post wager in the group.");
        });

      // Clear session
      userSessions.delete(userId);
      break;
  }
});

bot
  .launch()
  .then(() => console.log("🤖 Telegram bot started successfully! 🚀"));
