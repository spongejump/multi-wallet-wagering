import { Context } from "telegraf";
import { PointsHistoryModel } from "../models/pointsModel";
import { WalletModel } from "../models/WalletModel";

export async function handleRewards(ctx: Context) {
  try {
    if (!ctx.from?.username || !ctx.from?.id) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const telegramId = ctx.from.id.toString();
    const wallet = await WalletModel.getWalletByTelegramId(telegramId);

    if (!wallet) {
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one using /create_wallet"
      );
      return;
    }

    const referralBonus = await PointsHistoryModel.getReferralBonusPoints(
      wallet.walletAddr
    );
    const referredBonus = await PointsHistoryModel.getReferredBonusPoints(
      wallet.walletAddr
    );
    const wagerBonus = await PointsHistoryModel.getReferralWagerBonusPoints(
      wallet.walletAddr
    );

    const totalPoints = referralBonus + referredBonus + wagerBonus;

    const message = `🎁 *Your Rewards Summary*

💰 *Direct Referral Bonus:* ${referralBonus.toLocaleString()} points
👥 *Being Referred Bonus:* ${referredBonus.toLocaleString()} points
🎲 *Referral Wager Bonus:* ${wagerBonus.toLocaleString()} points

💫 *Total Rewards:* ${totalPoints.toLocaleString()} points

Use your referral code to earn more points!`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error fetching rewards:", error);
    await ctx.reply("❌ Error fetching your rewards. Please try again later.");
  }
}
