import { Context } from "telegraf";
import {
  SOLANA_WALLETS,
  EVENT_NAMES,
  EVENT_TITLES,
  TELEGRAM_CHAT_ID,
  THREAD_ID,
} from "../config/constants";
import { sendTelegramMessage } from "../services/telegramService";

interface UserSession {
  step: string;
  photoId?: string;
  title?: string;
  wager1?: string;
  wager1Wallet?: string;
  wager2?: string;
  wager2Wallet?: string;
  prediction?: string;
}

const userSessions = new Map<string, UserSession>();

export function handleCreateEvent(ctx: Context) {
  if (!ctx.from?.id || ctx.chat?.type !== "private") {
    return;
  }

  userSessions.set(ctx.from.id.toString(), { step: "waiting_for_photo" });
  ctx.reply(
    "📸 Please upload or paste an image to proceed with the event creation."
  );
}

export function handlePhoto(ctx: Context) {
  if (!ctx.from?.id) return;

  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);

  if (!session || session.step !== "waiting_for_photo") {
    return;
  }

  try {
    const photoArray = (ctx.message as any).photo;
    if (!photoArray || photoArray.length === 0) {
      return ctx.reply("⚠️ No image detected. Please try again.");
    }

    const photoId = photoArray[photoArray.length - 1].file_id;
    console.log("📸 Received photo ID:", photoId);

    session.photoId = photoId;
    session.step = "waiting_for_title";
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
}

export function handleText(ctx: Context) {
  if (!ctx.from?.id || ctx.chat?.type !== "private") return;

  const userId = ctx.from.id.toString();
  const session = userSessions.get(userId);

  if (!session) {
    return ctx.reply("⚠️ Please start by using /create_event.");
  }

  const messageText = (ctx.message as any).text;

  switch (session.step) {
    case "waiting_for_title":
      session.title = messageText;
      session.step = "waiting_for_wager1";
      userSessions.set(userId, session);
      ctx.reply("🏆 Input wager1 name:");
      break;

    case "waiting_for_wager1":
      session.wager1 = messageText;
      session.step = "waiting_for_wager1Wallet";
      userSessions.set(userId, session);
      ctx.reply("💰 Input wager1 Solana wallet address:");
      break;

    case "waiting_for_wager1Wallet":
      session.wager1Wallet = messageText;
      session.step = "waiting_for_wager2";
      userSessions.set(userId, session);
      ctx.reply("⚽ Input wager2 name:");
      break;

    case "waiting_for_wager2":
      session.wager2 = messageText;
      session.step = "waiting_for_wager2Wallet";
      userSessions.set(userId, session);
      ctx.reply("💰 Input wager2 Solana wallet address:");
      break;

    case "waiting_for_wager2Wallet":
      session.wager2Wallet = messageText;
      session.step = "waiting_for_prediction";
      userSessions.set(userId, session);
      ctx.reply("📜 Input wager prediction:");
      break;

    case "waiting_for_prediction":
      session.prediction = messageText;
      userSessions.set(userId, session);

      ctx.telegram
        .sendPhoto(TELEGRAM_CHAT_ID, session.photoId!, {
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

      userSessions.delete(userId);
      break;
  }
}
