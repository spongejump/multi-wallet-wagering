import dotenv from "dotenv";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

dotenv.config();

const rpcEndpoint = process.env.QUIKNODE_RPC || "";
const SOLANA_WALLET1_ADDRESS = process.env.SOLANA_WALLET1_ADDRESS || "";
const SOLANA_WALLET2_ADDRESS = process.env.SOLANA_WALLET2_ADDRESS || "";

const solanaConnection = new Connection(rpcEndpoint, "confirmed");

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

(async () => {
  const ACCOUNT_TO_WATCH = new PublicKey(SOLANA_WALLET1_ADDRESS);
  const subscriptionId = await solanaConnection.onAccountChange(
    ACCOUNT_TO_WATCH,
    (updatedAccountInfo) => {
      console.log(updatedAccountInfo);
      console.log(
        `---Event Notification for ${ACCOUNT_TO_WATCH.toString()}--- \nNew Account Balance:`,
        updatedAccountInfo.lamports / LAMPORTS_PER_SOL,
        " SOL"
      ),
        "confirmed";
    }
  );
  console.log("Starting web socket, subscription ID: ", subscriptionId);
  await sleep(10000); //Wait 10 seconds for Socket Testing
})();
