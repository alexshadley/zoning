import pg from "pg";

export const createClient = async () => {
  const client = new pg.Client({
    user: "postgres.dpprqwyenqpxwmitsmnk",
    host: "aws-0-us-east-1.pooler.supabase.com",
    database: "postgres",
    password: "nimbytears!",
  });

  await client.connect();

  return client;
};
