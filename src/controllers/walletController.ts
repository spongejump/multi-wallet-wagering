import { Context } from "telegraf";
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { WalletModel } from "../models/WalletModel";
import bs58 from "bs58";

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
    if (!ctx.from?.username) {
      await ctx.reply(
        "❌ You must have a Telegram username to create a wallet."
      );
      return;
    }

    const existingWallet = await WalletModel.getWalletByUsername(
      ctx.from.username
    );
    if (existingWallet) {
      await ctx.reply("❌ You already have a wallet registered!");
      return;
    }

    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);

    await WalletModel.createWallet({
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
