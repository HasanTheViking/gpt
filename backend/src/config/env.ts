import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/smartlist",
  suggestion: {
    frequentThreshold: 3,
    defaultIntervalDays: 14
  }
};
