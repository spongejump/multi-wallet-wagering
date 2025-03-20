import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// Function to fetch token decimals from the mint address
async function getNumberDecimals(
  mintAddress: string,
  connection: Connection
): Promise<number> {
  const info = await connection.getParsedAccountInfo(
    new PublicKey(mintAddress)
  );
  const result = (info.value?.data as ParsedAccountData).parsed.info
    .decimals as number;
  return result;
}

async function trackTokenTransfer(
  mainWalletAddress: string,
  tokenMintAddress: string,
  connection: Connection
) {
  let sendTokenAmount = 0;
  let tokenSender = "";

  const mainWalletPubKey = new PublicKey(mainWalletAddress);
  const tokenMintPubKey = new PublicKey(tokenMintAddress);

  const associatedTokenAddress = getAssociatedTokenAddressSync(
    tokenMintPubKey,
    mainWalletPubKey
  );

  let previousBalance = await getTokenBalance(); // Start with the current balance

  async function getTokenBalance() {
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    if (accountInfo && accountInfo.data) {
      const decoded = AccountLayout.decode(accountInfo.data);
      return Number(decoded.amount);
    }
    return 0;
  }

  // Fetch token decimals
  const tokenDecimals = await getNumberDecimals(tokenMintAddress, connection);

  return new Promise((resolve, reject) => {
    connection.onAccountChange(
      associatedTokenAddress,
      async (updatedAccountInfo, context) => {
        if (updatedAccountInfo.data) {
          const decoded = AccountLayout.decode(updatedAccountInfo.data);
          const newBalance = Number(decoded.amount);
          const tokenChange = newBalance - previousBalance;

          // if (tokenChange > 0) {
          sendTokenAmount = Math.abs(tokenChange) / Math.pow(10, tokenDecimals); // Adjusting for decimals

          // Get the transaction signature to identify the sender
          const confirmedSignatures = await connection.getSignaturesForAddress(
            associatedTokenAddress,
            {
              limit: 1,
            }
          );
          if (confirmedSignatures.length > 0) {
            const txSignature = confirmedSignatures[0].signature;
            const txDetails = await connection.getTransaction(txSignature, {
              commitment: "confirmed",
            });

            if (
              txDetails &&
              txDetails.transaction &&
              txDetails.transaction.message
            ) {
              const senderPubKey =
                txDetails.transaction.message.accountKeys[0].toBase58();
              tokenSender = senderPubKey;
            }
          }
          // }

          previousBalance = newBalance;
          resolve({ sendTokenAmount, tokenSender });
        }
      }
    );
  });
}

export { trackTokenTransfer };
