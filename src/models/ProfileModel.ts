import { pool } from "../config/database";

export interface Profile {
  id?: number;
  profile_picture?: string;
  wallet_id: string;
  created_at?: Date;
  updated_at?: Date;
  telegram_id: string;
  username: string;
  referral?: string;
  parent_referral_code?: string;
  points: number;
  defbet: number;
  GiftGiven: boolean;
  allowed_campaign_limit: number;
  remaining_campaign_limit: number;
  type: string;
}

export class ProfileModel {
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profile_picture VARCHAR(255),
        wallet_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        telegram_id VARCHAR(255) UNIQUE,
        username VARCHAR(50) UNIQUE,
        referral VARCHAR(255) UNIQUE,
        parent_referral_code VARCHAR(255),
        points BIGINT DEFAULT 0,
        defbet DECIMAL(20,2) DEFAULT 0.00,
        GiftGiven BOOLEAN DEFAULT FALSE,
        allowed_campaign_limit INT DEFAULT 3,
        remaining_campaign_limit INT DEFAULT 3,
        type VARCHAR(45) DEFAULT 'user'
      )
    `;

    try {
      await pool.execute(query);
    } catch (error) {
      console.error("Error creating profiles table:", error);
      throw error;
    }
  }

  static async createProfile(profile: Profile): Promise<void> {
    const query = `
      INSERT INTO profiles (
        wallet_id, telegram_id, username, referral, parent_referral_code,
        points, defbet, GiftGiven, allowed_campaign_limit,
        remaining_campaign_limit, type, profile_picture
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await pool.execute(query, [
        profile.wallet_id,
        profile.telegram_id,
        profile.username,
        profile.referral,
        profile.parent_referral_code,
        profile.points,
        profile.defbet,
        profile.GiftGiven,
        profile.allowed_campaign_limit,
        profile.remaining_campaign_limit,
        profile.type,
        profile.profile_picture,
      ]);
    } catch (error) {
      console.error("Error creating profile:", error);
      throw error;
    }
  }

  static async getProfileByTelegramId(
    telegram_id: string
  ): Promise<Profile | null> {
    const query = "SELECT * FROM profiles WHERE telegram_id = ?";
    try {
      const [rows]: any = await pool.execute(query, [telegram_id]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  static async getProfileByWalletId(
    wallet_id: string
  ): Promise<Profile | null> {
    const query = "SELECT * FROM profiles WHERE wallet_id = ?";
    try {
      const [rows]: any = await pool.execute(query, [wallet_id]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  static async getProfileByUsername(username: string): Promise<Profile | null> {
    const query = "SELECT * FROM profiles WHERE username = ?";
    try {
      const [rows]: any = await pool.execute(query, [username]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  static async updateProfile(
    wallet_id: string,
    updates: Partial<Profile>
  ): Promise<void> {
    const allowedUpdates = [
      "profile_picture",
      "username",
      "points",
      "defbet",
      "GiftGiven",
      "remaining_campaign_limit",
      "type",
    ];

    const validUpdates = Object.entries(updates)
      .filter(([key]) => allowedUpdates.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(validUpdates).length === 0) return;

    const setClause = Object.keys(validUpdates)
      .map((key) => `${key} = ?`)
      .join(", ");

    const query = `UPDATE profiles SET ${setClause} WHERE wallet_id = ?`;
    const values = [...Object.values(validUpdates), wallet_id];

    try {
      await pool.execute(query, values);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  static async getAllProfiles(): Promise<Profile[]> {
    const query = "SELECT * FROM profiles";
    try {
      const [rows]: any = await pool.execute(query);
      return rows;
    } catch (error) {
      console.error("Error fetching all profiles:", error);
      throw error;
    }
  }

  static async deleteProfile(wallet_id: string): Promise<void> {
    const query = "DELETE FROM profiles WHERE wallet_id = ?";
    try {
      await pool.execute(query, [wallet_id]);
    } catch (error) {
      console.error("Error deleting profile:", error);
      throw error;
    }
  }
}
