import { pool } from "../config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

interface Campaign extends RowDataPacket {
  campaign_id: number;
  name: string;
  description: string;
  image_url: string;
  left_button: string;
  right_button: string;
  updated_at: Date;
  completed: "false" | "true";
  winner: string | null;
  completion_date: Date | null;
  loser_to_winner_txn_hash: string | null;
  aiguess: boolean;
  visible: boolean;
  AiPrediction: string | null;
  AIReason: string | null;
  leftWallet: string | null;
  rightWallet: string | null;
  sol_received: number;
  tx_hash: string | null;
  expires_at: Date | null;
  is_automatically_completed: boolean;
  created_at: Date;
  lock_at: Date | null;
  ai_prediction: "left" | "right" | "draw";
  has_fee_transferred: boolean;
  category_id: number;
}

interface CreateCampaignData {
  name: string;
  description: string;
  image_url: string;
  left_button: string;
  right_button: string;
  leftWallet?: string;
  rightWallet?: string;
  category_id?: number;
}

export class CampaignModel {
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS campaign (
        campaign_id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        description text NOT NULL,
        image_url varchar(255) NOT NULL,
        left_button varchar(100) NOT NULL,
        right_button varchar(100) NOT NULL,
        updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed enum('false','true') NOT NULL DEFAULT 'false',
        winner varchar(255) DEFAULT NULL,
        completion_date datetime DEFAULT NULL,
        loser_to_winner_txn_hash varchar(255) DEFAULT NULL,
        aiguess tinyint(1) DEFAULT 0,
        visible tinyint(1) DEFAULT 0,
        AiPrediction varchar(255) DEFAULT NULL,
        AIReason text,
        leftWallet varchar(255) DEFAULT NULL,
        rightWallet varchar(255) DEFAULT NULL,
        sol_received decimal(18,6) DEFAULT 0.000000,
        tx_hash varchar(255) DEFAULT NULL,
        expires_at datetime DEFAULT NULL,
        is_automatically_completed tinyint(1) DEFAULT 0,
        created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        lock_at datetime DEFAULT NULL,
        ai_prediction enum('left','right','draw') DEFAULT 'left',
        has_fee_transferred tinyint(1) DEFAULT 0,
        category_id int NOT NULL DEFAULT 1,
        PRIMARY KEY (campaign_id),
        UNIQUE KEY name_UNIQUE (name),
        KEY fk_campaign_category (category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
    `;
    await pool.execute(query);
  }

  static async createCampaign(data: CreateCampaignData): Promise<number> {
    const query = `
      INSERT INTO campaign (
        name, description, image_url, left_button, right_button, 
        leftWallet, rightWallet, category_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.name,
      data.description,
      data.image_url,
      data.left_button,
      data.right_button,
      data.leftWallet || null,
      data.rightWallet || null,
      data.category_id || 1,
    ];

    const [result] = await pool.execute<ResultSetHeader>(query, values);
    return result.insertId;
  }

  static async getCampaignById(campaignId: number): Promise<Campaign | null> {
    const query = "SELECT * FROM campaign WHERE campaign_id = ?";
    const [rows] = await pool.execute<Campaign[]>(query, [campaignId]);
    return rows[0] || null;
  }

  static async getCampaignByName(name: string): Promise<Campaign | null> {
    const query = "SELECT * FROM campaign WHERE name = ?";
    const [rows] = await pool.execute<Campaign[]>(query, [name]);
    return rows[0] || null;
  }

  static async getAllCampaigns(): Promise<Campaign[]> {
    const query = "SELECT * FROM campaign ORDER BY created_at DESC";
    const [rows] = await pool.execute<Campaign[]>(query);
    return rows;
  }

  static async getActiveCampaigns(): Promise<Campaign[]> {
    const query =
      "SELECT * FROM campaign WHERE completed = 'false' AND visible = 1 ORDER BY created_at DESC";
    const [rows] = await pool.execute<Campaign[]>(query);
    return rows;
  }

  static async updateCampaign(
    campaignId: number,
    updates: Partial<Campaign>
  ): Promise<boolean> {
    const allowedFields = [
      "name",
      "description",
      "image_url",
      "left_button",
      "right_button",
      "completed",
      "winner",
      "completion_date",
      "loser_to_winner_txn_hash",
      "aiguess",
      "visible",
      "AiPrediction",
      "AIReason",
      "leftWallet",
      "rightWallet",
      "sol_received",
      "tx_hash",
      "expires_at",
      "is_automatically_completed",
      "lock_at",
      "ai_prediction",
      "has_fee_transferred",
      "category_id",
    ];

    const updateFields = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .map((key) => `${key} = ?`);

    if (updateFields.length === 0) return false;

    const query = `
      UPDATE campaign 
      SET ${updateFields.join(", ")} 
      WHERE campaign_id = ?
    `;

    const values = [
      ...updateFields.map((field) => updates[field.split(" ")[0]]),
      campaignId,
    ];

    const [result] = await pool.execute<ResultSetHeader>(query, values);
    return result.affectedRows > 0;
  }

  static async deleteCampaign(campaignId: number): Promise<boolean> {
    const query = "DELETE FROM campaign WHERE campaign_id = ?";
    const [result] = await pool.execute<ResultSetHeader>(query, [campaignId]);
    return result.affectedRows > 0;
  }

  static async markAsCompleted(
    campaignId: number,
    winner: string,
    txHash: string
  ): Promise<boolean> {
    const query = `
      UPDATE campaign 
      SET completed = 'true',
          winner = ?,
          completion_date = NOW(),
          loser_to_winner_txn_hash = ?
      WHERE campaign_id = ?
    `;
    const [result] = await pool.execute<ResultSetHeader>(query, [
      winner,
      txHash,
      campaignId,
    ]);
    return result.affectedRows > 0;
  }

  static async updateVisibility(
    campaignId: number,
    visible: boolean
  ): Promise<boolean> {
    const query = "UPDATE campaign SET visible = ? WHERE campaign_id = ?";
    const [result] = await pool.execute<ResultSetHeader>(query, [
      visible ? 1 : 0,
      campaignId,
    ]);
    return result.affectedRows > 0;
  }
}
