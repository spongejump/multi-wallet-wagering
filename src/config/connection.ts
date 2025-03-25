import { PRODUCTION_MODE, RPC_URL } from "./constants";
import { Connection } from "@solana/web3.js";

export const connection = new Connection(
  PRODUCTION_MODE ? RPC_URL : "https://api.devnet.solana.com",
  "confirmed"
);
