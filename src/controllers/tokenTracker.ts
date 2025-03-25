import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { sendTelegramMessage } from "../services/telegramService";
import {
  SOLANA_WALLETS,
  EVENT_NAMES,
  EVENT_TITLES,
  TELEGRAM_CHAT_ID,
  THREAD_ID,
} from "../config/constants";

export async function getNumberDecimals(
  mintAddress: string,
  connection: Connection
): Promise<number> {
  const info = await connection.getParsedAccountInfo(
    new PublicKey(mintAddress)
  );
  return (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
}

export async function trackTokenTransfer(
  mainWalletAddress: string,
  tokenMintAddress: string,
  connection: Connection,
  index: number
) {
  let sendTokenAmount = 0;
  let tokenSender = "";

  const mainWalletPubKey = new PublicKey(mainWalletAddress);
  const tokenMintPubKey = new PublicKey(tokenMintAddress);

  const associatedTokenAddress = getAssociatedTokenAddressSync(
    tokenMintPubKey,
    mainWalletPubKey
  );

  async function getTokenBalance() {
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    if (accountInfo && accountInfo.data) {
      const decoded = AccountLayout.decode(accountInfo.data);
      return Number(decoded.amount);
    }
    return 0;
  }

  let previousBalance = await getTokenBalance();
  const tokenDecimals = await getNumberDecimals(tokenMintAddress, connection);

  connection.onAccountChange(
    associatedTokenAddress,
    async (updatedAccountInfo) => {
      if (updatedAccountInfo.data) {
        const decoded = AccountLayout.decode(updatedAccountInfo.data);
        const newBalance = Number(decoded.amount);
        const tokenChange = newBalance - previousBalance;

        sendTokenAmount = Math.abs(tokenChange) / Math.pow(10, tokenDecimals);

        // Get the transaction signature to identify the sender
        const confirmedSignatures = await connection.getSignaturesForAddress(
          associatedTokenAddress,
          { limit: 1 }
        );

        if (confirmedSignatures.length > 0) {
          const txSignature = confirmedSignatures[0].signature;
          const txDetails = await connection.getTransaction(txSignature, {
            commitment: "confirmed",
          });

          if (txDetails?.transaction?.message) {
            tokenSender =
              txDetails.transaction.message.accountKeys[0].toBase58();
          }
        }

        previousBalance = newBalance;
        console.log(
          `sendTokenAmount, tokenSender: ${sendTokenAmount}, ${tokenSender}`
        );

        let message = "";
        console.log(`index is ${index}`);

        const isFromPairedWallet =
          (index % 2 === 0 && tokenSender === SOLANA_WALLETS[index + 1]) ||
          (index % 2 === 1 && tokenSender === SOLANA_WALLETS[index - 1]);

        if (isFromPairedWallet) {
          message = `📢 *Wager End Alert*\n\n🎲 A winner of *${
            EVENT_TITLES[Math.floor(index / 2)]
          }*  is *${EVENT_NAMES[index]}* wallet;`;

          await sendTelegramMessage(message);
          console.log(`✅ Notification sent for wallet ${index + 1}!`);
        } else if (
          sendTokenAmount > 0 &&
          SOLANA_WALLETS.indexOf(tokenSender) < 0
        ) {
          message = `📢 **Token Transfer Alert**
          
      🔹 **Sender:** [${tokenSender}](https://solscan.io/account/${tokenSender})  
      🔹 **Receiver:** [Wallet ${
        index + 1
      }](https://solscan.io/account/${mainWalletAddress})  
      💰 **Amount Transferred:** ${sendTokenAmount} $VS\
      
      🔎 *Click the wallet addresses to view transaction details on Solscan.*`;

          await sendTelegramMessage(message);
          console.log(`✅ Notification sent for wallet ${index + 1}!`);
        }
      }
    }
  );
}

export async function startTracking(
  connection: Connection,
  tokenMintAddress: string
) {
  for (let index = 0; index < SOLANA_WALLETS.length; index++) {
    trackTokenTransfer(
      SOLANA_WALLETS[index],
      tokenMintAddress,
      connection,
      index
    );
  }
}
