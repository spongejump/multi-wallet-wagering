import { Context } from "telegraf";
import { PointsHistoryModel } from "../models/pointsModel";
import { ProfileModel } from "../models/ProfileModel";

export async function handleRewards(ctx: Context) {
  try {
    if (!ctx.from?.username || !ctx.from?.id) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const telegramId = ctx.from.id.toString();
    const profile = await ProfileModel.getProfileByUsername(telegramId);

    if (!profile) {
      await ctx.reply(
        "❌ You don't have a profile yet. Create one using /create_profile"
      );
      return;
    }

    const referralBonus = await PointsHistoryModel.getReferralBonusPoints(
      profile.wallet_id
    );
    const referredBonus = await PointsHistoryModel.getReferredBonusPoints(
      profile.wallet_id
    );
    const wagerBonus = await PointsHistoryModel.getReferralWagerBonusPoints(
      profile.wallet_id
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
