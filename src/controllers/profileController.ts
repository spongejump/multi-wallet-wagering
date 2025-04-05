import { Context } from "telegraf";
import { ProfileModel, Profile } from "../models/ProfileModel";

export async function handleCreateProfile(ctx: Context) {
  try {
    if (!ctx.from?.username || !ctx.from?.id) {
      await ctx.reply(
        "❌ You must have a Telegram username to create a profile."
      );
      return;
    }

    const existingProfile = await ProfileModel.getProfileByUsername(
      ctx.from.username
    );
    if (existingProfile) {
      await ctx.reply("❌ You already have a profile!");
      return;
    }

    // Initialize all required fields with proper default values
    const newProfile: Profile = {
      wallet_id: "", // This will be linked later
      username: ctx.from.username,
      referral_code: generateReferralCode(ctx.from.username),
      parent_referral_code: undefined,
      points: 0,
      default_bet: 0,
      gift_given: false,
      allowed_campaign_limit: 3,
      remaining_campaign_limit: 3,
      user_type: "user",
      profile_picture: undefined,
    };

    await ProfileModel.createProfile(newProfile);

    await ctx.reply(
      `✅ Profile created successfully!
    
👤 *Profile Details*:
• Username: \`${newProfile.username}\`
• Referral Code: \`${newProfile.referral_code}\`
• Campaign Limit: ${newProfile.allowed_campaign_limit}
• Points: ${newProfile.points}

Use /show_profile to view your complete profile.`,
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
    if (!ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByUsername(ctx.from.username);
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const message = `👤 *Your Profile*

📝 *Details:*
• Username: \`${profile.username}\`
• Referral Code: \`${profile.referral_code}\`
• Points: ${profile.points}
• Default Bet: ${profile.default_bet}
• Remaining Campaigns: ${profile.remaining_campaign_limit}/${
      profile.allowed_campaign_limit
    }
${
  profile.parent_referral_code
    ? `• Invited By: \`${profile.parent_referral_code}\``
    : ""
}

🎮 *Status:*
• Type: ${profile.user_type}
• Gift Status: ${profile.gift_given ? "Received ✅" : "Not Received ❌"}`;

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
    if (!ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByUsername(ctx.from.username);
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
    const allowedFields = ["default_bet", "profile_picture"];

    if (!allowedFields.includes(field)) {
      await ctx.reply(
        "❌ Invalid field. You can only update: default_bet, profile_picture"
      );
      return;
    }

    const updates: Partial<Profile> = {
      [field]: field === "default_bet" ? parseFloat(value) : value,
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
    if (!ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByUsername(ctx.from.username);
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const message = `🎯 *Your Referral Information*

Your Referral Code: \`${profile.referral_code}\`

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

function generateReferralCode(username: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 5);
  return `${username}_${timestamp}${randomStr}`.toUpperCase();
}

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
    if (!ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const profile = await ProfileModel.getProfileByUsername(ctx.from.username);
    if (!profile) {
      await ctx.reply("❌ Profile not found. Create one using /create_profile");
      return;
    }

    const allProfiles = await ProfileModel.getAllProfiles();

    console.log(profile.referral_code);

    const totalReferrals = allProfiles.filter(
      (p) => p.parent_referral_code === profile.referral_code
    ).length;

    console.log(`totalReferrals is ${totalReferrals}`);

    const escapeMarkdown = (text: string) => {
      return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
    };

    const websiteUrl = escapeMarkdown(
      `www.wagervs.fun/${profile.referral_code || ""}`
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
