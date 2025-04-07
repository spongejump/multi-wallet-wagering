import { Context } from "telegraf";
import { Keypair } from "@solana/web3.js";
import { ProfileModel, Profile } from "../models/ProfileModel";
import bs58 from "bs58";
import { WalletModel } from "../models/WalletModel";
import crypto from "crypto";

export async function handleCreateProfile(ctx: Context) {
  try {
    if (!ctx.from?.username || !ctx.from?.id) {
      await ctx.reply(
        "❌ You must have a Telegram username to create a profile."
      );
      return;
    }

    const existingProfile = await ProfileModel.getProfileByTelegramId(
      ctx.from.id.toString()
    );
    if (existingProfile) {
      await ctx.reply("❌ You already have a profile!");
      return;
    }

    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);
    const walletData = {
      walletName: ctx.from.username,
      walletAddr: publicKey,
      walletKey: privateKey,
      sol_received: 0,
      tx_hash: `https://solscan.io/account/${publicKey}`,
      walletType: "telegram",
    };

    await WalletModel.createWallet(walletData);

    const newProfile: Profile = {
      wallet_id: publicKey,
      telegram_id: ctx.from.id.toString(),
      username: ctx.from.username,
      referral: generateRandomReferralCode(),
      parent_referral_code: "", //
      points: 0,
      defbet: 0,
      GiftGiven: false,
      allowed_campaign_limit: 3,
      remaining_campaign_limit: 3,
      type: "user",
      profile_picture: "", //
      created_at: new Date(),
      updated_at: new Date(),
    };

    await ProfileModel.createProfile(newProfile);

    await ctx.reply(
      `✅ Profile created successfully!

👤 *Profile Details*:
• Username: \`${ctx.from.username.replace(/`/g, "'")}\`
• Wallet ID: \`${newProfile.wallet_id.replace(/`/g, "'")}\`
• Referral Code: \`${newProfile.referral?.replace(/`/g, "'")}\`
• Campaign Limit: ${newProfile.allowed_campaign_limit}
• Points: ${newProfile.points}

Use /show\\_profile to view your complete profile.`,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("Error creating profile:", error);
    await ctx.reply("❌ Error creating profile. Please try again later.");
  }
}

export async function handleShowProfile(ctx: Context) {
  try {
    if (!ctx.from?.id || !ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const username = ctx.from.username;
    const profile = await ProfileModel.getProfileByTelegramId(
      ctx.from.id.toString()
    );
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const message = `👤 *Your Profile*

📝 *Details:*
• Username: \`${username.replace(/`/g, "'")}\`
• Wallet ID: \`${profile.wallet_id.replace(/`/g, "'")}\`
• Referral Code: \`${username.replace(/`/g, "'")}\`
• Points: ${profile.points}
• Default Bet: ${profile.defbet}
• Remaining Campaigns: ${profile.remaining_campaign_limit}/${
      profile.allowed_campaign_limit
    }
${
  profile.parent_referral_code
    ? `• Invited By: \`${profile.parent_referral_code.replace(/`/g, "'")}\``
    : ""
}

🎮 *Status:*
• Type: ${profile.type}
• Gift Status: ${profile.GiftGiven ? "Received ✅" : "Not Received"}`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error showing profile:", error);
    await ctx.reply("❌ Error fetching profile. Please try again later.");
  }
}

export async function handleUpdateProfile(ctx: Context) {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByTelegramId(
      ctx.from.id.toString()
    );
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const args = message.split(" ");

    if (args.length !== 3) {
      await ctx.reply("❌ Please use format: /update_profile [field] [value]");
      return;
    }

    const [_, field, value] = args;
    const allowedFields = ["defbet", "profile_picture"];

    if (!allowedFields.includes(field)) {
      await ctx.reply(
        "❌ Invalid field. You can only update: defbet, profile_picture"
      );
      return;
    }

    const updates: Partial<Profile> = {
      [field]: field === "defbet" ? parseFloat(value) : value,
    };

    await ProfileModel.updateProfile(profile.wallet_id, updates);
    await ctx.reply("✅ Profile updated successfully!");
  } catch (error) {
    console.error("Error updating profile:", error);
    await ctx.reply("❌ Error updating profile. Please try again later.");
  }
}

export async function handleReferral(ctx: Context) {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByTelegramId(
      ctx.from.id.toString()
    );
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const message = `🎯 *Your Referral Information*

Your Referral Code: \`${profile.referral}\`

Share this code with others to earn points!
New users can enter your code when creating their profile.

Current Points: ${profile.points}`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error fetching referral info:", error);
    await ctx.reply(
      "❌ Error fetching referral information. Please try again later."
    );
  }
}

const generateRandomReferralCode = () => {
  return crypto.randomInt(1000000000, 9999999999).toString(); // Generates a 10-digit number
};

export async function handleLeaderboard(ctx: Context) {
  try {
    const profiles = await ProfileModel.getAllProfiles();

    const sortedProfiles = profiles
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    let message = "🏆 *Top 10 Leaderboard*\n\n";

    sortedProfiles.forEach((profile, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "•";
      message += `${medal} ${index + 1}. \`${profile.username}\` - ${
        profile.points
      } points\n`;
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    await ctx.reply("❌ Error fetching leaderboard. Please try again later.");
  }
}

export async function handleReferralCodes(ctx: Context) {
  try {
    if (!ctx.from?.id) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByTelegramId(
      ctx.from.id.toString()
    );
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const allProfiles = await ProfileModel.getAllProfiles();

    const totalReferrals = allProfiles.filter(
      (p) => p.parent_referral_code === profile.referral
    ).length;

    const escapeMarkdown = (text: string) => {
      return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
    };

    const formatNumber = (num: number) => {
      return num.toFixed(2).replace(".", "\\.");
    };

    const websiteUrl = escapeMarkdown(
      `www.wagervs.fun/${profile.referral || ""}`
    );

    const message = `🔗 *Standard Rev Share* 🔗

${websiteUrl}

*New Wallets:* 150m points
*Token Sales:* 5% to your \\$VS Wallet
*ALL Wagers:* 10% Revenue Share

*Total Referrals:* ${totalReferrals}

👤 *Referral Points:* 13\\.5m
💰 *\\$VS Sales:* 106m
💸 *Wager Rev Share:* \\$305 USD`;

    const buttons = {
      inline_keyboard: [
        [
          { text: "Request Premium", callback_data: "request_premium" },
          { text: "Cash out", callback_data: "cash_out" },
        ],
      ],
    };

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      reply_markup: buttons,
    });
  } catch (error) {
    console.error("Error in handleReferralCodes:", error);
    await ctx.reply(
      "❌ Error fetching referral information. Please try again later."
    );
  }
}
