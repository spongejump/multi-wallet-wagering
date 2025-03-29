import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface Wager extends RowDataPacket {
  id?: number;
  campaign_id: number;
  wallet_id: string;
  amount: number;
  candidate: string;
  transaction_hash?: string;
  created_at?: Date;
  ip_address?: string;
  updated_at?: Date;
  result?: "win" | "loss" | "draw";
  multiplier?: number;
  amount_received?: number;
  is_refunded?: boolean;
}

interface CreateWager {
  campaign_id: number;
  wallet_id: string;
  amount: number;
  candidate: string;
  transaction_hash?: string;
  ip_address?: string;
}

export class WagerModel {
  static async createWager(wager: CreateWager): Promise<number> {
    try {
      const now = new Date();
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO wagers (
          campaign_id, 
          wallet_id, 
          amount, 
          candidate, 
          transaction_hash, 
          ip_address,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wager.campaign_id,
          wager.wallet_id,
          wager.amount,
          wager.candidate,
          wager.transaction_hash || null,
          wager.ip_address || null,
          now,
          now,
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error creating wager:", error);
      throw error;
    }
  }

  static async getWagerById(id: number): Promise<Wager | null> {
    try {
      const [rows] = await pool.execute<Wager[]>(
        "SELECT * FROM wagers WHERE id = ?",
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error getting wager:", error);
      throw error;
    }
  }

  static async getWagersByCampaignId(campaignId: number): Promise<Wager[]> {
    try {
      const [rows] = await pool.execute<Wager[]>(
        "SELECT * FROM wagers WHERE campaign_id = ?",
        [campaignId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting wagers by campaign:", error);
      throw error;
    }
  }

  static async getWagersByWalletId(walletId: string): Promise<Wager[]> {
    try {
      const [rows] = await pool.execute<Wager[]>(
        "SELECT * FROM wagers WHERE wallet_id = ?",
        [walletId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting wagers by wallet:", error);
      throw error;
    }
  }

  static async updateWagerResult(
    id: number,
    result: "win" | "loss" | "draw",
    multiplier: number,
    amountReceived: number
  ): Promise<boolean> {
    try {
      const [updateResult] = await pool.execute<ResultSetHeader>(
        `UPDATE wagers 
         SET result = ?, multiplier = ?, amount_received = ? 
         WHERE id = ?`,
        [result, multiplier, amountReceived, id]
      );
      return updateResult.affectedRows > 0;
    } catch (error) {
      console.error("Error updating wager result:", error);
      throw error;
    }
  }

  static async setWagerRefunded(id: number): Promise<boolean> {
    try {
      const [updateResult] = await pool.execute<ResultSetHeader>(
        "UPDATE wagers SET is_refunded = 1 WHERE id = ?",
        [id]
      );
      return updateResult.affectedRows > 0;
    } catch (error) {
      console.error("Error setting wager as refunded:", error);
      throw error;
    }
  }

  static async updateTransactionHash(
    id: number,
    hash: string
  ): Promise<boolean> {
    try {
      const [updateResult] = await pool.execute<ResultSetHeader>(
        "UPDATE wagers SET transaction_hash = ? WHERE id = ?",
        [hash, id]
      );
      return updateResult.affectedRows > 0;
    } catch (error) {
      console.error("Error updating transaction hash:", error);
      throw error;
    }
  }

  static async getPendingWagers(): Promise<Wager[]> {
    try {
      const [rows] = await pool.execute<Wager[]>(
        "SELECT * FROM wagers WHERE result IS NULL AND is_refunded = 0"
      );
      return rows;
    } catch (error) {
      console.error("Error getting pending wagers:", error);
      throw error;
    }
  }

  static async getWageredCampaigns(walletAddr: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT
        w.campaign_id,
        c.name as campaign_name
      FROM wagers w
      JOIN campaign c ON w.campaign_id = c.campaign_id
      WHERE w.wallet_id = ?
      ORDER BY w.campaign_id DESC
    `;

    try {
      const [rows]: any = await pool.execute(query, [walletAddr]);
      return rows;
    } catch (error) {
      console.error("Error fetching wagered campaigns:", error);
      throw error;
    }
  }
}
