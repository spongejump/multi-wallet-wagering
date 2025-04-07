import { bot } from "./services/telegramService";
import { connection } from "./config/connection";
import { Context } from "telegraf";
import {
  TOKEN_MINT_ADDRESS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ADMIN_PRIVATE_KEY,
} from "./config/constants";
import { startTracking } from "./controllers/tokenTracker";

import {
  startAllWalletMonitoring,
  activeSubscriptions,
  handleShowWallet,
  handleMyWagers,
} from "./controllers/walletController";
import { WalletModel } from "./models/WalletModel";
import { handleBuyVS, monitorSolReceiver } from "./controllers/buyController";
import {
  handleAllCampaigns,
  handleActiveCampaigns,
} from "./controllers/campaignController";

import { handleWager, handleWagerButton } from "./controllers/wagerController";
// import path from "path";
// import fs from "fs";
import { usernameMonitor } from "./middleware/usernameMonitor";
import {
  handleCreateProfile,
  handleShowProfile,
  handleReferralCodes,
} from "./controllers/profileController";
import { handleRewards } from "./controllers/pointController";

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TOKEN_MINT_ADDRESS) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

async function initializeDatabase() {
  try {
    await WalletModel.createTable();
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    process.exit(1);
  }
}

bot.use(usernameMonitor);

bot.command("buyVS", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply(
      "⚠️ This command can only be used in private chat with the bot."
    );
  }
  await handleBuyVS(ctx);
});

bot.command("show_wallet", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply(
      "⚠️ This command can only be used in private chat with the bot."
    );
  }
  await handleShowWallet(ctx, connection);
});

bot.command("start", async (ctx) => {
  const welcomeMessage = `*WagerVS Bot* is the ultimate PVP experience in web3\\. 

🤖Enjoy the *ONLY* AI Agent Predictions Market Bot to offer:

• Making wagers on everything sports, web3, politics & more
• User Custom Wagers \\(coming soon\\!\\)
• Revenue Share Referral Links \\(coming soon\\!\\)
• AI Agent Predictions \\(coming soon\\!\\)
• Create a wallet
• Airdrops to leaderboard
• Buy \\$VS

/help to get started

🎮Web App: [www\\.wagervs\\.fun](https://www.wagervs.fun)
📚Docs: [wagervs\\.fun/whitepaper/](https://wagervs.fun/whitepaper/)`;

  try {
    await ctx.replyWithPhoto("https://i.postimg.cc/0ySJWzGz/botLogo.png", {
      caption: welcomeMessage,
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    console.error("Error sending start message:", error);
    await ctx.sendMessage("Welcome to WagerVS Bot! Type /help to get started.");
  }
});

bot.command("help", async (ctx) => {
  const helpMessage = `
🤖 *Available Commands:*

/create\\_profile \\- Create a new profile \\(private chat only\\)
/buyVS \\[SOL amount\\] \\- Buy VS tokens \\(private chat only\\)
/allCampaigns \\- View all campaigns
/activeCampaigns \\- View active campaigns
/wager \\[campaignId\\] \\[$amount\\] \\- Place a wager
/show\\_wallet \\- Show your wallet \\(private chat only\\)
/show\\_profile \\- Show your profile
/show\\_wages \\- View your wagers
/referralCodes \\- View your referral statistics and earnings
/help \\- Show this help message

⚠️ Some commands are only available in private chat with the bot\\.`;

  await ctx.reply(helpMessage, { parse_mode: "MarkdownV2" });
});

bot.command("allCampaigns", async (ctx) => {
  await handleAllCampaigns(ctx);
});

bot.command("activeCampaigns", async (ctx) => {
  await handleActiveCampaigns(ctx);
});

bot.command("wager", async (ctx) => {
  await handleWager(ctx);
});

bot.action(/^wager_(left|right)_\d+$/, async (ctx) => {
  await handleWagerButton(ctx);
});

bot.command("show_profile", async (ctx) => {
  await handleShowProfile(ctx);
});

bot.command("show_wages", handleMyWagers);

bot.command("create_profile", async (ctx) => {
  await handleCreateProfile(ctx);
});

bot.command("referralCodes", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply(
      "⚠️ This command can only be used in private chat with the bot."
    );
  }
  await handleReferralCodes(ctx);
});

bot.command("rewards", async (ctx) => {
  await handleRewards(ctx);
});

async function startApp() {
  try {
    await initializeDatabase();

    await startAllWalletMonitoring(connection);

    await monitorSolReceiver(connection, ADMIN_PRIVATE_KEY);

    startTracking(connection, TOKEN_MINT_ADDRESS);

    process.once("SIGINT", () => {
      for (const [_, subscriptionId] of activeSubscriptions) {
        connection.removeAccountChangeListener(subscriptionId);
      }
      bot.stop("SIGINT");
    });
    process.once("SIGTERM", () => {
      for (const [_, subscriptionId] of activeSubscriptions) {
        connection.removeAccountChangeListener(subscriptionId);
      }
      bot.stop("SIGTERM");
    });

    await bot.launch();
    console.log("🤖 Telegram bot started successfully! 🚀");
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

startApp().catch(console.error);
