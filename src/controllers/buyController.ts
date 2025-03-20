import { Context } from "telegraf";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

const SOL_RECEIVER = "F5ojBQNvSzM3TCNCwj1mGd4qxsuGP2XizRNLRKzRpJd3";
const VS_TOKEN_MINT = "D7wHZsj4MdNDuuLznrxut4kPztjMcKJ21nPzGe6Qn3MU";
const VS_TOKEN_DECIMALS = 9;
const SOL_PRICE = 0.0000165;

// Handle /buyVS command
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

    // Calculate VS tokens to receive
    const vsTokenAmount = (solAmount * SOL_PRICE) / 0.0000165;

    const buyMessage = `🔄 To receive ${vsTokenAmount} VS tokens:

1. Send ${solAmount} SOL to:
\`${SOL_RECEIVER}\`

2. VS tokens will be automatically sent to your wallet address that sent the SOL

⏳ Please wait for confirmation after sending SOL.`;

    await ctx.reply(buyMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error handling buyVS command:", error);
    await ctx.reply(
      "❌ Error processing your request. Please try again later."
    );
  }
}

// Monitor SOL receiver and send VS tokens
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
            // Get recent transaction to identify sender
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

              // Calculate VS tokens to send
              const vsTokenAmount = (solReceived * SOL_PRICE) / 0.0000165;
              const vsTokensWithDecimals = Math.floor(
                vsTokenAmount * Math.pow(10, VS_TOKEN_DECIMALS)
              );

              // Get or create sender's VS token account
              const senderVsAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                adminKeypair,
                new PublicKey(VS_TOKEN_MINT),
                new PublicKey(senderAddress)
              );

              // Mint VS tokens to sender's account
              await mintTo(
                connection,
                adminKeypair,
                new PublicKey(VS_TOKEN_MINT),
                senderVsAccount.address,
                adminKeypair.publicKey,
                vsTokensWithDecimals
              );

              console.log(
                `✅ Sent ${vsTokenAmount} VS tokens to ${senderAddress}`
              );
            }
          } catch (error) {
            console.error("Error sending VS tokens:", error);
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
