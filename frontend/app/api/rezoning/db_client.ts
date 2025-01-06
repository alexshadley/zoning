import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

export const createClient = async () => {
  const client = new pg.Client({
    user: "postgres.dpprqwyenqpxwmitsmnk",
    host: "aws-0-us-east-1.pooler.supabase.com",
    database: "postgres",
    password: process.env.SUPABASE_PW,
  });

  await client.connect();

  return client;
};
