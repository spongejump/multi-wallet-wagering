import { PRODUCTION_MODE, RPC_URL } from "./constants";
import { Connection } from "@solana/web3.js";

const DEVNET_URL = "https://api.devnet.solana.com";

export const connection = new Connection(
  PRODUCTION_MODE ? RPC_URL : DEVNET_URL,
  "confirmed"
);
