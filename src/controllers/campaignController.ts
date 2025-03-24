import { Context } from "telegraf";
import { CampaignModel } from "../models/CampaignModel";
import { Markup } from "telegraf";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { Connection } from "@solana/web3.js";
import { WalletModel } from "../models/WalletModel";
import { sendVSTokens, getSolPrice } from "./buyController";

interface WagerSession {
  campaignId: number;
  amount: number;
}

const userWagerSessions = new Map<number, WagerSession>();

export async function handleAllCampaigns(ctx: Context) {
  try {
    const campaigns = await CampaignModel.getAllCampaigns();

    if (campaigns.length === 0) {
      await ctx.reply("📭 No campaigns found.");
      return;
    }

    const campaignChunks: string[] = [];
    let currentChunk = "📋 *All Campaigns*\n\n";

    for (const campaign of campaigns) {
      const campaignInfo = `*${campaign.name}*
📝 Description: *${campaign.description.substring(0, 100)}${
        campaign.description.length > 100 ? "..." : ""
      }*
👈 Left Button: *${campaign.left_button}*
👉 Right Button: *${campaign.right_button}*
🏆 Winner: *${
        campaign.completed === "true" ? campaign.left_button : "Not decided"
      }*
📊 Status: *${campaign.completed === "true" ? "✅ Completed" : "🔄 Active"}*
⏰ Created: *${new Date(campaign.created_at).toLocaleString()}*
${
  campaign.expires_at
    ? `⌛ Expires: ${new Date(campaign.expires_at).toLocaleString()}`
    : ""
}
${
  campaign.lock_at
    ? `🔒 Locks: ${new Date(campaign.lock_at).toLocaleString()}`
    : ""
}
\n`;

      if ((currentChunk + campaignInfo).length > 4000) {
        campaignChunks.push(currentChunk);
        currentChunk = campaignInfo;
      } else {
        currentChunk += campaignInfo;
      }
    }

    if (currentChunk) {
      campaignChunks.push(currentChunk);
    }

    for (const chunk of campaignChunks) {
      await ctx.reply(chunk, {
        parse_mode: "Markdown",
      });
    }
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    await ctx.reply("❌ Error fetching campaigns. Please try again later.");
  }
}

export async function handleActiveCampaigns(ctx: Context) {
  try {
    const campaigns = await CampaignModel.getActiveCampaigns();

    if (campaigns.length === 0) {
      await ctx.reply("📭 No active campaigns found.");
      return;
    }

    let message = "🎯 *Active Campaigns*\n\n";

    for (const campaign of campaigns) {
      message += `*${campaign.name}*
👈 ${campaign.left_button} vs 👉 ${campaign.right_button}
📝 ${campaign.description.substring(0, 100)}${
        campaign.description.length > 100 ? "..." : ""
      }
⏰ Expires: ${
        campaign.expires_at
          ? new Date(campaign.expires_at).toLocaleString()
          : "No expiration"
      }
\n`;
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error fetching active campaigns:", error);
    await ctx.reply(
      "❌ Error fetching active campaigns. Please try again later."
    );
  }
}

export async function handleWager(ctx: Context) {
  try {
    const message = (ctx.message as any).text.split(" ");
    if (message.length !== 3) {
      return ctx.reply(
        "❌ Please use the correct format: /wager [campaignId] [$amount]"
      );
    }

    const campaignId = parseInt(message[1]);
    const dollarAmount = parseFloat(message[2].replace("$", ""));

    if (isNaN(campaignId) || isNaN(dollarAmount) || dollarAmount <= 0) {
      return ctx.reply("❌ Please enter valid campaign ID and dollar amount");
    }

    const campaign = await CampaignModel.getCampaignById(campaignId);
    if (!campaign) {
      return ctx.reply("❌ Campaign not found");
    }

    if (campaign.completed === "true") {
      return ctx.reply("❌ This campaign is already completed");
    }

    if (campaign.lock_at && new Date(campaign.lock_at) <= new Date()) {
      return ctx.reply("❌ This campaign is locked for betting");
    }

    if (!ctx.from?.username) {
      return ctx.reply(
        "❌ You must have a Telegram username to use this command."
      );
    }

    const userWallet = await WalletModel.getWalletByUsername(ctx.from.username);
    if (!userWallet) {
      return ctx.reply(
        "❌ You don't have a wallet. Please create one using /create_wallet"
      );
    }

    const solPrice = await getSolPrice();
    const vsTokenAmount = (dollarAmount * solPrice) / 0.0000165;

    if (ctx.from) {
      userWagerSessions.set(ctx.from.id, {
        campaignId,
        amount: vsTokenAmount,
      });
    }

    const campaignMessage = `🎯 *${campaign.name}*

📝 *Description:* ${campaign.description}

💰 *Your Wager Amount:* $${dollarAmount.toFixed(2)} (${vsTokenAmount.toFixed(
      2
    )} VS)

Please select your prediction:`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          campaign.left_button,
          `wager_left_${campaignId}`
        ),
        Markup.button.callback(
          campaign.right_button,
          `wager_right_${campaignId}`
        ),
      ],
    ]);

    await ctx.reply(campaignMessage, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch (error) {
    console.error("Error handling wager:", error);
    await ctx.reply("❌ Error processing wager. Please try again later.");
  }
}

export async function handleWagerButton(ctx: any) {
  try {
    if (!ctx.from) return;

    const session = userWagerSessions.get(ctx.from.id);
    if (!session) {
      await ctx.answerCbQuery("❌ No active wager session found");
      return;
    }

    const callbackData = ctx.callbackQuery.data;
    const [action, side, campaignId] = callbackData.split("_");

    if (parseInt(campaignId) !== session.campaignId) {
      await ctx.answerCbQuery("❌ Campaign mismatch");
      return;
    }

    const campaign = await CampaignModel.getCampaignById(session.campaignId);
    if (!campaign) {
      await ctx.answerCbQuery("❌ Campaign not found");
      return;
    }

    const userWallet = await WalletModel.getWalletByUsername(ctx.from.username);
    if (!userWallet) {
      await ctx.answerCbQuery(
        "❌ Please create a wallet first using /create_wallet"
      );
      return;
    }

    const targetWallet =
      side === "left" ? campaign.leftWallet : campaign.rightWallet;
    if (!targetWallet) {
      await ctx.answerCbQuery("❌ Target wallet not configured");
      return;
    }

    try {
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );
      const userKeypair = Keypair.fromSecretKey(
        bs58.decode(userWallet.walletKey)
      );

      const signature = await sendVSTokens(
        connection,
        userKeypair,
        targetWallet,
        session.amount
      );

      const confirmMessage = `✅ *Wager Placed Successfully!*

🎯 *Campaign:* ${campaign.name}
💰 *Amount:* ${session.amount} VS
🎲 *Prediction:* ${
        side === "left" ? campaign.left_button : campaign.right_button
      }
🔍 [View Transaction](https://solscan.io/tx/${signature}?cluster=devnet)`;

      await ctx.editMessageText(confirmMessage, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });

      userWagerSessions.delete(ctx.from.id);
    } catch (error) {
      console.error("Error processing wager transaction:", error);
      await ctx.answerCbQuery("❌ Error processing transaction");
    }
  } catch (error) {
    console.error("Error handling wager button:", error);
    await ctx.answerCbQuery("❌ Error processing wager");
  }
}
