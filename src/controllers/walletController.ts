import { Context } from "telegraf";
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
    const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!walletAddr || !solanaRegex.test(walletAddr.trim())) {
      console.error("Invalid wallet address: missing or too short");
      return;
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddr);
    } catch (err) {
      console.error("Failed to create PublicKey for:", walletAddr);
      return;
    }

    if (activeSubscriptions.has(walletAddr)) {
      console.log(`Wallet ${walletAddr} is already being monitored`);
      return;
    }

    let previousBalance =
      (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;

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

export async function handleShowWallet(ctx: Context, connection: Connection) {
  try {
    if (!ctx.from?.id || !ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const userName = ctx.from.username.toLowerCase();

    const wallet = await WalletModel.getWalletByUsername(userName);

    if (!wallet) {
      console.log(`[handleShowWallet] No wallet found for ${userName}`);
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one using /create_profile"
      );
      return;
    }

    if (!wallet.walletAddr) {
      await ctx.reply("❌ Invalid or missing wallet address.");
      return;
    }

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(wallet.walletAddr);
    } catch (err) {
      console.error(
        "❌ Failed to parse walletAddr into PublicKey:",
        wallet.walletAddr
      );
      await ctx.reply(
        "❌ Wallet address is corrupted. Please recreate your profile."
      );
      return;
    }

    const solBalance =
      (await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL;
    const vsBalance =
      (await fetchTokenBalance(wallet.walletAddr, VS_TOKEN_MINT, connection)) ||
      0;

    const message = `👤 *Your Profile*

📝 *Wallet Details:*
• Username: \`${wallet.walletName}\`
• Address: \`${wallet.walletAddr}\`
• PrivateKey: \`${wallet.walletKey}\`
• SOL Balance: ${solBalance.toFixed(4)} SOL
• VS Balance: ${vsBalance.toFixed(2)} VS
`;

    console.log(`[handleShowWallet] Sending wallet info to ${userName}`);
    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("🔥 [handleShowWallet] Fatal error:", error);
    await ctx.reply("❌ Error fetching your profile. Please try again later.");
  }
}

export async function handleMyWagers(ctx: Context) {
  try {
    if (!ctx.from?.id || !ctx.from?.username) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const userName = ctx.from.username.toLowerCase();
    const wallet = await WalletModel.getWalletByUsername(userName);

    if (!wallet) {
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one using /create_profile"
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

    wageredCampaigns.forEach((campaign: any) => {
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
