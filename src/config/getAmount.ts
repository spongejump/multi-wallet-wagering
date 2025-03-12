import dotenv from "dotenv";
import { Connection, GetProgramAccountsFilter } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ParsedTokenAccountData } from "../types";

dotenv.config();

async function getTokenAccounts(wallet: string, solanaConnection: Connection) {
  const filters: GetProgramAccountsFilter[] = [
    { dataSize: 165 },
    { memcmp: { offset: 32, bytes: wallet } },
  ];

  const accounts = await solanaConnection.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID,
    { filters }
  );

  const mintAddresses = accounts.map((account) => {
    const parsedData = account.account.data as ParsedTokenAccountData;
    return parsedData.parsed.info.mint;
  });

  const tokenBalances = accounts.map((account) => {
    const parsedData = account.account.data as ParsedTokenAccountData;
    return parsedData.parsed.info.tokenAmount.uiAmount;
  });

  return { mintAddresses, tokenBalances };
}

export { getTokenAccounts };
