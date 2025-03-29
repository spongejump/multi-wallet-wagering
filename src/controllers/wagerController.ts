import { Context } from "telegraf";
import { CampaignModel } from "../models/CampaignModel";
import { Markup } from "telegraf";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { WalletModel } from "../models/WalletModel";
import { sendVSTokens, getSolPrice } from "./buyController";
import {
  VS_TOKEN_MINT,
  VS_TOKEN_DECIMALS,
  getSolscanUrl,
} from "../config/constants";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { WagerModel } from "../models/WagerModel";
import { fetchTokenBalance } from "../config/getAmount";

interface WagerSession {
  campaignId: number;
  amount: number;
}

const userWagerSessions = new Map<number, WagerSession>();

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
    const vsTokenAmount = dollarAmount / 0.0000165;

    if (ctx.from) {
      userWagerSessions.set(ctx.from.id, {
        campaignId,
        amount: vsTokenAmount,
      });
    }

    const campaignMessage = `🎯 *${campaign.campaign_id} - ${campaign.name}*

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
      const userKeypair = Keypair.fromSecretKey(
        bs58.decode(userWallet.walletKey)
      );

      const currentBalance =
        (await fetchTokenBalance(
          userWallet.walletAddr,
          VS_TOKEN_MINT,
          connection
        )) || 0;

      if (currentBalance < session.amount) {
        await ctx.answerCbQuery(
          `❌ Insufficient VS tokens. You have ${currentBalance.toFixed(
            2
          )} VS but need ${session.amount.toFixed(2)} VS`
        );
        return;
      }

      const wagerData = {
        campaign_id: session.campaignId,
        wallet_id: userWallet.walletAddr,
        amount: session.amount,
        candidate:
          side === "left" ? campaign.left_button : campaign.right_button,
        ip_address: "123.123.123.123",
        // ip_address: `tg:${ctx.from.id}:${ctx.from.username || "unknown"}`,
      };

      const wagerId = await WagerModel.createWager(wagerData);

      if (!wagerId) {
        throw new Error("Failed to add wager record");
      }

      try {
        const signature = await sendVSTokens(
          connection,
          userKeypair,
          targetWallet,
          session.amount
        );

        await WagerModel.updateTransactionHash(wagerId, signature);

        const confirmMessage = `✅ *Wager Placed Successfully!*

🎯 *Campaign:* ${campaign.name}
💰 *Amount:* ${session.amount} VS
🎲 *Prediction:* ${
          side === "left" ? campaign.left_button : campaign.right_button
        }
🔍 [View Transaction](${getSolscanUrl(signature)})`;

        await ctx.editMessageText(confirmMessage, {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        });

        userWagerSessions.delete(ctx.from.id);
      } catch (error) {
        await WagerModel.updateTransactionHash(wagerId, "failed");
        throw error;
      }
    } catch (error: any) {
      console.error("Error processing wager transaction:", error);
      let errorMessage = "❌ Error processing transaction";

      if (
        error.logs?.some((log: string) => log.includes("insufficient funds"))
      ) {
        errorMessage = "❌ Insufficient VS tokens in your wallet";
      }

      await ctx.answerCbQuery(errorMessage);
    }
  } catch (error) {
    console.error("Error handling wager button:", error);
    await ctx.answerCbQuery("❌ Error processing wager");
  }
}
