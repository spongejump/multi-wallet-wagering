import { bot } from "./services/telegramService";
import { connection } from "./config/connection";
import {
  TOKEN_MINT_ADDRESS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} from "./config/constants";
import { startTracking } from "./controllers/tokenTracker";
import {
  handleCreateEvent,
  handlePhoto,
  handleText,
} from "./controllers/eventController";
import {
  handleCreateWallet,
  startAllWalletMonitoring,
  activeSubscriptions,
} from "./controllers/walletController";
import { WalletModel } from "./models/WalletModel";

// Validate environment variables
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TOKEN_MINT_ADDRESS) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

// Initialize database
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

// Start the application
async function startApp() {
  try {
    await initializeDatabase();

    // Start monitoring all wallets
    await startAllWalletMonitoring(connection);

    // Start token tracking
    startTracking(connection, TOKEN_MINT_ADDRESS);

    // Enable graceful stop
    process.once("SIGINT", () => {
      // Clean up subscriptions
      for (const [_, subscriptionId] of activeSubscriptions) {
        connection.removeAccountChangeListener(subscriptionId);
      }
      bot.stop("SIGINT");
    });
    process.once("SIGTERM", () => {
      // Clean up subscriptions
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
