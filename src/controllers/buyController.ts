import { Context } from "telegraf";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
} from "@solana/web3.js";
import axios from "axios";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { WalletModel } from "../models/WalletModel";

const SOL_RECEIVER = "F5ojBQNvSzM3TCNCwj1mGd4qxsuGP2XizRNLRKzRpJd3";
const VS_TOKEN_MINT = "D7wHZsj4MdNDuuLznrxut4kPztjMcKJ21nPzGe6Qn3MU";
const VS_TOKEN_DECIMALS = 9;
const KRAKEN_API_URL = "https://api.kraken.com/0/public/Ticker?pair=SOLUSD";

export async function getSolPrice(): Promise<number> {
  try {
    const response = await axios.get(KRAKEN_API_URL);
    if (response.data && response.data.result && response.data.result.SOLUSD) {
      const price = parseFloat(response.data.result.SOLUSD.c[0]);
      console.log(`Current SOL price: $${price}`);
      return price;
    }
    throw new Error("Invalid response from Kraken API");
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    throw error;
  }
}

async function sendSol(
  connection: Connection,
  fromWallet: Keypair,
  toAddress: string,
  amount: number
) {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      fromWallet,
    ]);

    console.log(`Transaction sent: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Error sending SOL:", error);
    throw error;
  }
}

export async function sendVSTokens(
  connection: Connection,
  adminKeypair: Keypair,
  receiverAddress: string,
  amount: number
) {
  try {
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      new PublicKey(VS_TOKEN_MINT),
      adminKeypair.publicKey
    );

    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      new PublicKey(VS_TOKEN_MINT),
      new PublicKey(receiverAddress)
    );

    const tokenAmount = Math.floor(amount * Math.pow(10, VS_TOKEN_DECIMALS));

    const transferInstruction = createTransferInstruction(
      adminTokenAccount.address,
      receiverTokenAccount.address,
      adminKeypair.publicKey,
      tokenAmount
    );

    const transaction = new Transaction().add(transferInstruction);
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      adminKeypair,
    ]);

    console.log(`Token transfer successful: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Error sending VS tokens:", error);
    throw error;
  }
}

export async function handleBuyVS(ctx: Context) {
  try {
    const message = (ctx.message as any).text.split(" ");
    if (message.length !== 2) {
      return ctx.reply("❌ Please use the correct format: /buyVS [amount]");
    }

    const solAmount = parseFloat(message[1]);
    if (isNaN(solAmount) || solAmount <= 0) {
      return ctx.reply("❌ Please enter a valid SOL amount");
    }

    const username = ctx.from?.username;
    if (!username) {
      return ctx.reply(
        "❌ You must have a Telegram username to use this command."
      );
    }

    const userWallet = await WalletModel.getWalletByUsername(username);
    if (!userWallet) {
      return ctx.reply(
        "❌ You don't have a wallet. Please create one using /create_wallet"
      );
    }
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );
    const userKeypair = Keypair.fromSecretKey(
      bs58.decode(userWallet.walletKey)
    );
    const balance =
      (await connection.getBalance(userKeypair.publicKey)) / LAMPORTS_PER_SOL;

    const requiredAmount = solAmount + 0.001;

    if (balance < requiredAmount) {
      return ctx.reply(`❌ Insufficient balance!

💰 Your balance: ${balance.toFixed(4)} SOL
🔄 Required: ${solAmount} SOL
💸 + 0.001 SOL (for fees)
📊 Total needed: ${requiredAmount} SOL`);
    }
    const SOL_PRICE = await getSolPrice();
    const vsTokenAmount = (solAmount * SOL_PRICE) / 0.0000165;

    try {
      const signature = await sendSol(
        connection,
        userKeypair,
        SOL_RECEIVER,
        solAmount
      );

      const buyMessage = `✅ Transaction Successful!

💰 *Transaction Details:*
• Sent: ${solAmount} SOL
• Received: VS tokens: ${vsTokenAmount.toFixed(4)}
• [Transaction](https://solscan.io/tx/${signature}?cluster=devnet)

⏳ VS tokens are automatically transferred to your wallet.`;

      await ctx.reply(buyMessage, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Error sending SOL:", error);
      await ctx.reply("❌ Error sending SOL. Please try again later.");
    }
  } catch (error) {
    console.error("Error handling buyVS command:", error);
    await ctx.reply(
      "❌ Error processing your request. Please try again later."
    );
  }
}

export async function monitorSolReceiver(
  connection: Connection,
  adminPrivateKey: string
) {
  try {
    const receiverPubkey = new PublicKey(SOL_RECEIVER);
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(adminPrivateKey));
    let previousBalance =
      (await connection.getBalance(receiverPubkey)) / LAMPORTS_PER_SOL;

    console.log("🔄 Started monitoring SOL receiver wallet");

    connection.onAccountChange(
      receiverPubkey,
      async (accountInfo) => {
        const currentBalance = accountInfo.lamports / LAMPORTS_PER_SOL;

        if (currentBalance > previousBalance) {
          const solReceived = currentBalance - previousBalance;
          console.log(`Received ${solReceived} SOL`);

          try {
            const signatures = await connection.getSignaturesForAddress(
              receiverPubkey,
              { limit: 1 }
            );
            const txDetails = await connection.getTransaction(
              signatures[0].signature
            );

            if (txDetails) {
              const senderAddress =
                txDetails.transaction.message.accountKeys[0].toBase58();
              console.log(`Sender address: ${senderAddress}`);
              const SOL_PRICE = await getSolPrice();
              const vsTokenAmount = (solReceived * SOL_PRICE) / 0.0000165;

              const tokenTxSignature = await sendVSTokens(
                connection,
                adminKeypair,
                senderAddress,
                vsTokenAmount
              );

              console.log(
                `✅ Sent ${vsTokenAmount} VS tokens to ${senderAddress}`
              );
              console.log(`Token transaction: ${tokenTxSignature}`);
            }
          } catch (error) {
            console.error("Error processing token transfer:", error);
          }
        }
        previousBalance = currentBalance;
      },
      "confirmed"
    );
  } catch (error) {
    console.error("Error monitoring SOL receiver:", error);
  }
}
