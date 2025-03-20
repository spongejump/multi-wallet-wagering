import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

export const pool = mysql.createPool(dbConfig);

// Test the connection
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Database connection successful");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });
