import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: process.env.PORT ?? "5000",
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  MONGODB_DB: process.env.MONGODB_DB ?? "RajibElectronics",
  CORS_ORIGINS:
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://localhost:3001,https://rajibelectornics.com,https://www.rajibelectornics.com,https://admin.rajibelectornics.com,https://www.admin.rajibelectornics.com",
  JWT_SECRET:
    process.env.JWT_SECRET ?? "fallback-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  REFRESH_SECRET: process.env.REFRESH_SECRET ?? "",
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:5000",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  STEADFAST_API_KEY: process.env.STEADFAST_API_KEY || "",
  STEADFAST_API_SECRET: process.env.STEADFAST_API_SECRET || "",
  PATHAO_CLIENT_ID: process.env.PATHAO_CLIENT_ID || "",
  PATHAO_CLIENT_SECRET: process.env.PATHAO_CLIENT_SECRET || "",
  PATHAO_USERNAME: process.env.PATHAO_USERNAME || "",
  PATHAO_PASSWORD: process.env.PATHAO_PASSWORD || "",
  PATHAO_BASE_URL:
    process.env.PATHAO_BASE_URL || "https://hermes-sandbox.pathao.com",
  PAYSTATION_MERCHANT_ID: process.env.PAYSTATION_MERCHANT_ID || "",
  PAYSTATION_PASSWORD: process.env.PAYSTATION_PASSWORD || "",
  PAYSTATION_BASE_URL: process.env.PAYSTATION_BASE_URL || "https://sandbox.paystation.com.bd",
  CUSTOMER_FRONTEND_URL: process.env.CUSTOMER_FRONTEND_URL || "http://localhost:3000",
};
