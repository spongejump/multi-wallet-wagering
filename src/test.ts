import { Connection } from "@solana/web3.js";
import dotenv from "dotenv";
import { getTokenAccounts } from "./config/getAmount";

// Load environment variables
dotenv.config();

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const wallet = process.env.SOLANA_WALLET1_ADDRESS || "";

// Immediately Invoked Function Expression (IIFE)
(async () => {
  try {
    const tokenBalance = await getTokenAccounts(
      wallet,
      "D7wHZsj4MdNDuuLznrxut4kPztjMcKJ21nPzGe6Qn3MU",
      connection
    );
    console.log(`tokenBalances: ${tokenBalance}`);
  } catch (error) {
    console.error("Error fetching token accounts:", error);
  }
})();
