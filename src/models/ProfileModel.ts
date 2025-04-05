import { pool } from "../config/database";

export interface Profile {
  id?: number;
  profile_picture?: string;
  wallet_id: string;
  created_at?: Date;
  updated_at?: Date;
  username: string;
  referral_code?: string;
  parent_referral_code?: string;
  points: number;
  default_bet: number;
  gift_given: boolean;
  allowed_campaign_limit: number;
  remaining_campaign_limit: number;
  user_type: string;
}

export class ProfileModel {
  static async createTable(profile: Profile): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY
        profile_picture VARCHAR(255),
        wallet_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        username VARCHAR(50) UNIQUE,
        referral_code VARCHAR(255) UNIQUE,
        parent_referral_code VARCHAR(255),
        points BIGINT DEFAULT 0,
        default_bet DECIMAL(20,2) DEFAULT 0.00,
        gift_given BOOLEAN DEFAULT FALSE,
        allowed_campaign_limit INT DEFAULT 3,
        remaining_campaign_limit INT DEFAULT 3,
        user_type VARCHAR(45) DEFAULT 'user',
        FOREIGN KEY (parent_referral_code) REFERENCES profiles(referral_code)
      )
    `;

    const values = [
      profile.wallet_id || null,
      profile.username,
      profile.referral_code || null,
      profile.parent_referral_code || null,
      profile.points || 0,
      profile.default_bet || 0,
      profile.gift_given || false,
      profile.allowed_campaign_limit || 3,
      profile.remaining_campaign_limit || 3,
      profile.user_type || "user",
      profile.profile_picture || null,
    ];

    try {
      await pool.execute(query, values);
    } catch (error) {
      console.error("Error creating profiles table:", error);
      throw error;
    }
  }

  static async createProfile(profile: Profile): Promise<void> {
    const query = `
      INSERT INTO profiles (
        wallet_id, username, referral_code, parent_referral_code,
        points, default_bet, gift_given, allowed_campaign_limit,
        remaining_campaign_limit, user_type, profile_picture
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await pool.execute(query, [
        profile.wallet_id,
        profile.username,
        profile.referral_code,
        profile.parent_referral_code,
        profile.points,
        profile.default_bet,
        profile.gift_given,
        profile.allowed_campaign_limit,
        profile.remaining_campaign_limit,
        profile.user_type,
        profile.profile_picture,
      ]);
    } catch (error) {
      console.error("Error creating profile:", error);
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
      "default_bet",
      "gift_given",
      "remaining_campaign_limit",
      "user_type",
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
