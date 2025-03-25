import fs from "fs";

export function saveTokenTransfer(
  wallet: string,
  sender: string,
  amount: number
): void {
  try {
    const filePath = "data.json";
    let data: Record<string, Record<string, number>> = {};

    if (fs.existsSync(filePath)) {
      try {
        const rawData = fs.readFileSync(filePath, "utf8");
        data = JSON.parse(rawData);
      } catch (error) {
        console.error("Error reading or parsing JSON file.", error);
        data = {};
      }
    }

    if (!data[wallet]) {
      data[wallet] = {};
    }

    data[wallet][sender] = (data[wallet][sender] || 0) + amount;

    fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) console.error("Error saving token transfer:", err);
    });
  } catch (error) {
    console.error("Error saving token transfer:", error);
  }
}
