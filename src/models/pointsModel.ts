import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

interface PointsHistory extends RowDataPacket {
  id?: number;
  wallet_id: string;
  referrer_wallet_id?: string;
  event_type: string;
  points: number;
  related_transaction_id?: string;
  timestamp?: Date;
  description?: string;
}

interface CreatePointsHistoryData {
  wallet_id: string;
  referrer_wallet_id?: string;
  event_type: string;
  points: number;
  related_transaction_id?: string;
  description?: string;
}

export class PointsHistoryModel {
  static async createPointsHistory(
    data: CreatePointsHistoryData
  ): Promise<void> {
    const query = `
            INSERT INTO points_history (
                wallet_id, referrer_wallet_id, event_type, points,
                related_transaction_id, description
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

    try {
      await pool.execute(query, [
        data.wallet_id,
        data.referrer_wallet_id || null,
        data.event_type,
        data.points,
        data.related_transaction_id || null,
        data.description || null,
      ]);
    } catch (error) {
      console.error("Error creating points history:", error);
      throw error;
    }
  }

  static async getPointsHistoryByWalletId(
    wallet_id: string
  ): Promise<PointsHistory[]> {
    const query =
      "SELECT * FROM points_history WHERE wallet_id = ? ORDER BY timestamp DESC";
    try {
      const [rows] = await pool.execute<PointsHistory[]>(query, [wallet_id]);
      return rows;
    } catch (error) {
      console.error("Error fetching points history:", error);
      throw error;
    }
  }

  static async getTotalPointsByWalletId(wallet_id: string): Promise<number> {
    const query =
      "SELECT SUM(points) as total FROM points_history WHERE wallet_id = ?";
    try {
      const [rows]: any = await pool.execute(query, [wallet_id]);
      return rows[0]?.total || 0;
    } catch (error) {
      console.error("Error calculating total points:", error);
      throw error;
    }
  }

  static async getReferralPointsByWalletId(wallet_id: string): Promise<number> {
    const query =
      "SELECT SUM(points) as total FROM points_history WHERE referrer_wallet_id = ?";
    try {
      const [rows]: any = await pool.execute(query, [wallet_id]);
      return rows[0]?.total || 0;
    } catch (error) {
      console.error("Error calculating referral points:", error);
      throw error;
    }
  }

  static async getReferralBonusPoints(wallet_id: string): Promise<number> {
    const query = `
        SELECT SUM(points) as total 
        FROM points_history 
        WHERE referrer_wallet_id = ? 
        AND event_type = 'referral_bonus'
    `;

    try {
      const [rows]: any = await pool.execute(query, [wallet_id]);
      return rows[0]?.total || 0;
    } catch (error) {
      console.error("Error getting referral bonus points:", error);
      return 0;
    }
  }

  static async getReferredBonusPoints(wallet_id: string): Promise<number> {
    const query = `
        SELECT SUM(points) as total 
        FROM points_history 
        WHERE referrer_wallet_id = ? 
        AND event_type = 'referred_bonus'
    `;

    try {
      const [rows]: any = await pool.execute(query, [wallet_id]);
      return rows[0]?.total || 0;
    } catch (error) {
      console.error("Error getting referred bonus points:", error);
      return 0;
    }
  }

  static async getReferralWagerBonusPoints(wallet_id: string): Promise<number> {
    const query = `
        SELECT SUM(points) as total 
        FROM points_history 
        WHERE referrer_wallet_id = ? 
        AND event_type = 'referral_wager_bonus'
    `;

    try {
      const [rows]: any = await pool.execute(query, [wallet_id]);
      return rows[0]?.total || 0;
    } catch (error) {
      console.error("Error getting referral wager bonus points:", error);
      return 0;
    }
  }
}
