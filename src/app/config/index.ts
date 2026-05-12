import dotenv from "dotenv";
dotenv.config();
interface EnvConfig {
  PORT: string;
  NODE_ENV: "development" | "production";
  DATABASE_URL: string;
  BCRYPT_SALT: string;
  CLOUD_NAME: string;
  CLOUD_API_KEY: string;
  CLOUD_API_SECRET: string;
  JWT_ACCESS_TOKEN_SECRET: string;
  JWT_ACCESS_TOKEN_EXPIRESIN: string;
  JWT_REFRESH_TOKEN_SECRET: string;
  JWT_REFRESH_TOKEN_EXPIRESIN: string;
  OPEN_AI_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  REDIS_PASS: string;
  REDIS_USERNAME: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  FRONTEND_URL: string;
  SMTP_PASS: string;
  SMTP_USER: string;
  SMTP_HOST: string;
  SMTP_FROM: string;
  SMTP_PORT: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
}

const loadEnvVariables = (): EnvConfig => {
  const requiredEnvVariables: string[] = [
    "PORT",
    "NODE_ENV",
    "DATABASE_URL",
    "BCRYPT_SALT",
    "CLOUD_NAME",
    "CLOUD_API_KEY",
    "CLOUD_API_SECRET",
    "JWT_ACCESS_TOKEN_SECRET",
    "JWT_ACCESS_TOKEN_EXPIRESIN",
    "JWT_REFRESH_TOKEN_SECRET",
    "JWT_REFRESH_TOKEN_EXPIRESIN",
    "OPEN_AI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "REDIS_PASS",
    "REDIS_USERNAME",
    "REDIS_HOST",
    "REDIS_PORT",
    "FRONTEND_URL",
    "SMTP_PASS",
    "SMTP_USER",
    "SMTP_HOST",
    "SMTP_FROM",
    "SMTP_PORT",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL",
  ];

  requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing require environment variabl ${key}`);
    }
  });

  return {
    PORT: process.env.PORT as string,
    NODE_ENV: process.env.NODE_ENV as "development" | "production",
    DATABASE_URL: process.env.DATABASE_URL as string,
    BCRYPT_SALT: process.env.BCRYPT_SALT as string,
    CLOUD_NAME: process.env.CLOUD_NAME as string,
    CLOUD_API_KEY: process.env.CLOUD_API_KEY as string,
    CLOUD_API_SECRET: process.env.CLOUD_API_SECRET as string,
    JWT_ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_TOKEN_SECRET as string,
    JWT_ACCESS_TOKEN_EXPIRESIN: process.env
      .JWT_ACCESS_TOKEN_EXPIRESIN as string,
    JWT_REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_TOKEN_SECRET as string,
    JWT_REFRESH_TOKEN_EXPIRESIN: process.env
      .JWT_REFRESH_TOKEN_EXPIRESIN as string,
    OPEN_AI_API_KEY: process.env.OPEN_AI_API_KEY as string,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
    REDIS_PASS: process.env.REDIS_PASS as string,
    REDIS_USERNAME: process.env.REDIS_USERNAME as string,
    REDIS_HOST: process.env.REDIS_HOST as string,
    REDIS_PORT: process.env.REDIS_PORT as string,
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    SMTP_PASS: process.env.SMTP_PASS as string,
    SMTP_USER: process.env.SMTP_USER as string,
    SMTP_HOST: process.env.SMTP_HOST as string,
    SMTP_FROM: process.env.SMTP_FROM as string,
    SMTP_PORT: process.env.SMTP_PORT as string,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID as string,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY as string,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL as string,
  };
};

export const envVars = loadEnvVariables();
