import dotenv from "dotenv";
dotenv.config();
export const env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: process.env.PORT ?? "5000",
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    MONGODB_DB: process.env.MONGODB_DB ?? "RajibElectronics",
    CORS_ORIGINS: process.env.CORS_ORIGINS ||
        "http://localhost:3000,http://localhost:3001,https://rajib-electornics-admin.vercel.app,https://rajib-electornics-frontend.vercel.app",
    JWT_SECRET: process.env.JWT_SECRET ?? "fallback-secret-key-change-in-production",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
    REFRESH_SECRET: process.env.REFRESH_SECRET ?? "",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "rajibElectronics",
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
    PATHAO_BASE_URL: process.env.PATHAO_BASE_URL || "https://hermes-sandbox.pathao.com",
};
