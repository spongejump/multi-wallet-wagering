import { Context } from "telegraf";
import { CampaignModel } from "../models/CampaignModel";

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
      const campaignInfo = `Name: *${campaign.name}*
📝 Description: ${campaign.description.substring(0, 100)}${
        campaign.description.length > 100 ? "..." : ""
      }
👈 Left Button: ${campaign.left_button}
👉 Right Button: ${campaign.right_button}
🏆 Winner: *${
        campaign.completed === "true" ? campaign.left_button : "Not decided"
      }*
📊 Status: ${campaign.completed === "true" ? "✅ Completed" : "🔄 Active"}
⏰ Created: ${new Date(campaign.created_at).toLocaleString()}
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
