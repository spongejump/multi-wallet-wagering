import { Context } from "telegraf";
import { bot } from "../services/telegramService";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletModel } from "../models/WalletModel";
import { WagerModel } from "../models/WagerModel";
import { fetchTokenBalance } from "../config/getAmount";
import { VS_TOKEN_MINT } from "../config/constants";

export const activeSubscriptions = new Map<string, number>();

export async function monitorWalletBalance(
  walletAddr: string,
  connection: Connection
) {
  try {
    if (!walletAddr) {
      console.error("Cannot monitor wallet: wallet address is undefined");
      return;
    }

    if (activeSubscriptions.has(walletAddr)) {
      console.log(`Wallet ${walletAddr} is already being monitored`);
      return;
    }

    const publicKey = new PublicKey(walletAddr);

    let previousBalance =
      (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;
    // console.log(`Started monitoring wallet: ${walletAddr}`);
    // console.log(`Initial balance: ${previousBalance} SOL`);

    const subscriptionId = connection.onAccountChange(
      publicKey,
      async (accountInfo) => {
        const currentBalance = accountInfo.lamports / LAMPORTS_PER_SOL;

        try {
          await WalletModel.updateWalletBalance(walletAddr, currentBalance);
          console.log(
            `Updated wallet ${walletAddr} balance to ${currentBalance} SOL`
          );
        } catch (error) {
          console.error(`Error updating wallet balance: ${error}`);
        }

        previousBalance = currentBalance;
      },
      "confirmed"
    );

    activeSubscriptions.set(walletAddr, subscriptionId);
  } catch (error) {
    console.error(`Error monitoring wallet ${walletAddr}:`, error);
  }
}

export async function startAllWalletMonitoring(connection: Connection) {
  try {
    for (const [walletAddr, subscriptionId] of activeSubscriptions) {
      await connection.removeAccountChangeListener(subscriptionId);
    }
    activeSubscriptions.clear();

    const wallets = await WalletModel.getAllWallets();

    for (const wallet of wallets) {
      await monitorWalletBalance(wallet.walletAddr, connection);
    }
  } catch (error) {
    console.error("Error starting wallet monitoring:", error);
  }
}

export async function handleShowProfile(ctx: Context, connection: Connection) {
  try {
    if (!ctx.from?.id || !ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const userName = ctx.from.username;

    if (!userName) {
      await ctx.reply("❌ Could not identify your username.");
      return;
    }

    const wallet = await WalletModel.getWalletByUsername(userName);

    if (!wallet) {
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one using /create_wallet"
      );
      return;
    }

    // Get current SOL balance
    const publicKey = new PublicKey(wallet.walletAddr);
    const balance = (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;

    // Get VS token balance
    const vsBalance =
      (await fetchTokenBalance(wallet.walletAddr, VS_TOKEN_MINT, connection)) ||
      0;

    const message = `👤 *Your Profile*

📝 *Wallet Details:*
• Username: \`${wallet.walletName}\`
• Address: \`${wallet.walletAddr}\`
• PrivateKey: \`${wallet.walletKey}\`
• SOL Balance: ${balance.toFixed(4)} SOL
• VS Balance: ${vsBalance.toFixed(2)} VS

`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error showing profile:", error);
    await ctx.reply("❌ Error fetching your profile. Please try again later.");
  }
}

export async function handleMyWagers(ctx: Context) {
  try {
    if (!ctx.from?.id || !ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const userName = ctx.from.username;

    const wallet = await WalletModel.getWalletByUsername(userName);
    if (!wallet) {
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one using /create_wallet"
      );
      return;
    }

    const wageredCampaigns = await WagerModel.getWageredCampaigns(
      wallet.walletAddr
    );

    if (wageredCampaigns.length === 0) {
      await ctx.reply("You haven't placed any wagers yet.");
      return;
    }

    let message = "🎯 *Your Wagered Campaigns*\n\n";
    let totalWagerAmount = 0;

    wageredCampaigns.forEach((campaign) => {
      message += `• ID: *${campaign.campaign_id}* - *${campaign.campaign_name}*\n`;
      message += `  Total Wagered: *${campaign.total_amount}* $VS\n`;
      totalWagerAmount += Number(campaign.total_amount);
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error showing wagered campaigns:", error);
    await ctx.reply("❌ Error fetching your wagers. Please try again later.");
  }
}
