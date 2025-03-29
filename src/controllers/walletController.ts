import { Context } from "telegraf";
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { WalletModel } from "../models/WalletModel";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { WagerModel } from "../models/WagerModel";
import { fetchTokenBalance } from "../config/getAmount";
import { VS_TOKEN_MINT } from "../config/constants";

export const activeSubscriptions = new Map<string, number>();

export async function monitorWalletBalance(
  walletAddr: string,
  connection: Connection
) {
  try {
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

export async function handleCreateWallet(ctx: Context, connection: Connection) {
  try {
    if (!ctx.from?.username || !ctx.from?.id) {
      await ctx.reply(
        "❌ You must have a Telegram username to create a wallet."
      );
      return;
    }

    const telegramId = ctx.from.id.toString();
    console.log(`Creating wallet for Telegram ID: ${telegramId}`);

    const existingWallet = await WalletModel.getWalletByTelegramId(telegramId);
    if (existingWallet) {
      await ctx.reply("❌ You already have a wallet registered!");
      return;
    }

    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);

    await WalletModel.createWallet({
      telegram_id: telegramId,
      walletName: ctx.from.username,
      walletAddr: publicKey,
      walletKey: privateKey,
      sol_received: 0,
      tx_hash: `https://solscan.io/account/${publicKey}`,
    });

    await monitorWalletBalance(publicKey, connection);

    const message = `✅ Wallet created successfully!
    
🏦 *Wallet Details*:
👤 Username: \`${ctx.from.username}\`
📝 Public Key: \`${publicKey}\`
🔐 Private Key: \`${privateKey}\`

🔍 [View on Solscan](https://solscan.io/account/${publicKey})

⚠️ *IMPORTANT*: Never share your private key with anyone!`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error creating wallet:", error);
    await ctx.reply("❌ Error creating wallet. Please try again later.");
  }
}

export async function startAllWalletMonitoring(connection: Connection) {
  try {
    for (const [walletAddr, subscriptionId] of activeSubscriptions) {
      await connection.removeAccountChangeListener(subscriptionId);
    }
    activeSubscriptions.clear();

    const wallets = await WalletModel.getAllWallets();
    console.log(`Found ${wallets.length} wallets to monitor`);

    for (const wallet of wallets) {
      await monitorWalletBalance(wallet.walletAddr, connection);
    }

    console.log(`Started monitoring ${wallets.length} wallets`);
  } catch (error) {
    console.error("Error starting wallet monitoring:", error);
  }
}

export async function handleShowProfile(ctx: Context, connection: Connection) {
  try {
    if (!ctx.from?.id) {
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
    if (!ctx.from?.id) {
      await ctx.reply("❌ Could not identify user.");
      return;
    }

    const wallet = await WalletModel.getWalletByTelegramId(
      ctx.from.id.toString()
    );
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
