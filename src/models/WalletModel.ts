import { pool } from "../config/database";

export interface Wallet {
  id?: number;
  walletName: string;
  walletAddr: string;
  walletKey: string;
  sol_received: number;
  tx_hash: string;
}

export class WalletModel {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS wallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        walletName VARCHAR(255) NOT NULL,
        walletAddr VARCHAR(255) NOT NULL UNIQUE,
        walletKey VARCHAR(255) NOT NULL,
        sol_received DECIMAL(18,9) DEFAULT 0,
        tx_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await pool.execute(query);
    } catch (error) {
      console.error("Error creating table:", error);
      throw error;
    }
  }

  static async createWallet(wallet: Wallet): Promise<void> {
    const query = `
      INSERT INTO wallets (walletName, walletAddr, walletKey, sol_received, tx_hash)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      await pool.execute(query, [
        wallet.walletName,
        wallet.walletAddr,
        wallet.walletKey,
        wallet.sol_received,
        wallet.tx_hash,
      ]);
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  }

  static async getWalletByUsername(username: string): Promise<Wallet | null> {
    const query = "SELECT * FROM wallets WHERE walletName = ?";
    try {
      const [rows]: any = await pool.execute(query, [username]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching wallet:", error);
      throw error;
    }
  }

  static async updateWalletBalance(
    walletAddr: string,
    balance: number
  ): Promise<void> {
    const query = `
      UPDATE wallets 
      SET sol_received = ?
      WHERE walletAddr = ?
    `;

    try {
      await pool.execute(query, [balance, walletAddr]);
    } catch (error) {
      console.error("Error updating wallet balance:", error);
      throw error;
    }
  }

  static async getWalletByAddress(walletAddr: string): Promise<Wallet | null> {
    const query = "SELECT * FROM wallets WHERE walletAddr = ?";
    try {
      const [rows]: any = await pool.execute(query, [walletAddr]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching wallet:", error);
      throw error;
    }
  }

  static async getAllWallets(): Promise<Wallet[]> {
    const query = "SELECT * FROM wallets";
    try {
      const [rows]: any = await pool.execute(query);
      return rows;
    } catch (error) {
      console.error("Error fetching wallets:", error);
      throw error;
    }
  }
}
