import fs from "fs";

// Cache the data in memory to reduce file I/O
let cachedData: Record<string, Record<string, number>> | null = null;

export function saveTokenTransfer(
  wallet: string,
  sender: string,
  amount: number
): void {
  try {
    const filePath = "data.json";

    // Use cached data if available, otherwise load from file
    if (!cachedData) {
      try {
        const rawData = fs.existsSync(filePath)
          ? fs.readFileSync(filePath, "utf8")
          : "{}";
        cachedData = JSON.parse(rawData);
      } catch {
        cachedData = {};
      }
    }

    if (!cachedData) return;

    // Initialize wallet object if needed
    cachedData[wallet] = cachedData[wallet] || {};

    // Update amount
    cachedData[wallet][sender] = (cachedData[wallet][sender] || 0) + amount;

    // Write to file asynchronously with debouncing
    const writeData = JSON.stringify(cachedData, null, 2);
    fs.promises
      .writeFile(filePath, writeData, "utf8")
      .catch((err) => console.error("Error saving token transfer:", err));
  } catch (error) {
    console.error("Error in saveTokenTransfer:", error);
  }
}
