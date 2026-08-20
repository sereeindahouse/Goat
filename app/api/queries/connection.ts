import { Db, MongoClient } from "mongodb";
import { env } from "../lib/env";

type Counter = { _id: string; value: number };

let client: MongoClient | undefined;
let database: Db | undefined;

export async function getDb(): Promise<Db> {
  if (!env.databaseUrl) {
    throw new Error(
      "MONGODB_URI is not configured. Add a MongoDB connection string to app/.env.",
    );
  }

  if (!client) {
    client = new MongoClient(env.databaseUrl);
    await client.connect();
    database = client.db(env.databaseName || undefined);
    await Promise.all([
      database.collection("users").createIndex({ unionId: 1 }, { unique: true }),
      database.collection("posts").createIndex({ createdAt: -1 }),
      database.collection("comments").createIndex({ postId: 1, createdAt: 1 }),
      database.collection("guestbook").createIndex({ createdAt: -1 }),
      database.collection("postViews").createIndex({ postId: 1, userId: 1 }, { unique: true }),
      database.collection("postEndorsements").createIndex({ postId: 1, userId: 1 }, { unique: true }),
    ]);
    await database.collection("posts").updateMany(
      { category: { $nin: ["Технологи", "Амьдрал", "Урлаг", "Аялал", "Бодлого"] } },
      { $set: { category: "Амьдрал" } },
    );
  }

  return database!;
}

export async function nextId(collectionName: string): Promise<number> {
  const db = await getDb();
  const result = await db.collection<Counter>("_counters").findOneAndUpdate(
    { _id: collectionName },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!result) throw new Error(`Could not allocate an ID for ${collectionName}`);
  return result.value;
}
