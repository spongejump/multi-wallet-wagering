import { Connection, PublicKey } from "@solana/web3.js";

async function isContractAddress(
  address: string,
  connection: Connection
): Promise<boolean> {
  const publicKey = new PublicKey(address);
  const accountInfo = await connection.getAccountInfo(publicKey);
  // If the account exists, the `executable` property tells you if it's a contract.
  return accountInfo ? accountInfo.executable : false;
}

// Example usage:
const connection = new Connection(
  "https://api.mainnet-beta.solana.com",
  "confirmed"
);
const address = "Go8M7JdgsCfuBhBdMs2UC48mtdnp8Ev4RHXAwGDVnakz";

isContractAddress(address, connection)
  .then((isContract) => {
    if (isContract) {
      console.log(`${address} is a contract (program) address.`);
    } else {
      console.log(`${address} is a wallet (or non-executable) address.`);
    }
  })
  .catch((error) => console.error("Error fetching account info:", error));
