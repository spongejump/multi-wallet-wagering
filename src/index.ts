import { bot } from "./services/telegramService";
import { connection } from "./config/connection";
import {
  TOKEN_MINT_ADDRESS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ADMIN_PRIVATE_KEY,
} from "./config/constants";
import { startTracking } from "./controllers/tokenTracker";

import {
  handleCreateWallet,
  startAllWalletMonitoring,
  activeSubscriptions,
  handleShowProfile,
  handleMyWagers,
} from "./controllers/walletController";
import { WalletModel } from "./models/WalletModel";
import { handleBuyVS, monitorSolReceiver } from "./controllers/buyController";
import {
  handleAllCampaigns,
  handleActiveCampaigns,
} from "./controllers/campaignController";

import { handleWager, handleWagerButton } from "./controllers/wagerController";

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

bot.command("create_wallet", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply(
      "⚠️ This command can only be used in private chat with the bot."
    );
  }

  await handleCreateWallet(ctx, connection);
});

bot.command("buyVS", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply(
      "⚠️ This command can only be used in private chat with the bot."
    );
  }
  await handleBuyVS(ctx);
});

bot.command("help", async (ctx) => {
  const helpMessage = `
🤖 *Available Commands:*

/create\\_wallet \\- Create a new wallet \\(private chat only\\)
/buyVS \\[SOL amount\\] \\- Buy VS tokens \\(private chat only\\)
/allCampaigns \\- View all campaigns
/activeCampaigns \\- View active campaigns
/wager \\[campaignId\\] \\[$amount\\] \\- Place a wager
/show\\_profile \\- Show your profile
/show\\_wages \\- View your wagers
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
  await handleShowProfile(ctx, connection);
});

bot.command("show_wages", handleMyWagers);

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
