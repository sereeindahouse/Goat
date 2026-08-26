import { Db, MongoClient } from "mongodb";
import { env } from "../lib/env";

type Counter = { _id: string; value: number };

let database: Db | undefined;
let initialization: Promise<Db> | undefined;

export async function getDb(): Promise<Db> {
  if (!env.databaseUrl) {
    throw new Error(
      "MONGODB_URI is not configured. Add a MongoDB connection string to app/.env.",
    );
  }

  if (!database) {
    initialization ??= initializeDatabase();
    try {
      database = await initialization;
    } catch (error) {
      initialization = undefined;
      database = undefined;
      throw error;
    }
  }

  return database;
}

async function initializeDatabase(): Promise<Db> {
  const nextClient = new MongoClient(env.databaseUrl, {
    connectTimeoutMS: 8000,
    serverSelectionTimeoutMS: 8000,
    family: 4,
  });
  await nextClient.connect();
  const nextDatabase = nextClient.db(env.databaseName || undefined);
  await nextDatabase.collection("conversations").dropIndex("participantIds_1").catch(() => undefined);
  await Promise.all([
    nextDatabase.collection("users").createIndex({ unionId: 1 }, { unique: true }),
    nextDatabase.collection("posts").createIndex({ createdAt: -1 }),
    nextDatabase.collection("comments").createIndex({ postId: 1, createdAt: 1 }),
    nextDatabase.collection("guestbook").createIndex({ createdAt: -1 }),
    nextDatabase.collection("postViews").createIndex({ postId: 1, userId: 1 }, { unique: true }),
    nextDatabase.collection("postEndorsements").createIndex({ postId: 1, userId: 1 }, { unique: true }),
    nextDatabase.collection("groups").createIndex({ createdAt: -1 }),
    nextDatabase.collection("groupMembers").createIndex({ groupId: 1, userId: 1 }, { unique: true }),
    nextDatabase.collection("groupInvites").createIndex({ groupId: 1, inviteeId: 1, status: 1 }),
    nextDatabase.collection("groupJoinRequests").createIndex({ groupId: 1, userId: 1, status: 1 }),
    nextDatabase.collection("notifications").createIndex({ userId: 1, createdAt: -1 }),
    nextDatabase.collection("conversations").createIndex({ participantKey: 1 }, { unique: true }),
    nextDatabase.collection("messages").createIndex({ conversationId: 1, createdAt: 1 }),
    nextDatabase.collection("bookmarks").createIndex({ postId: 1, userId: 1 }, { unique: true }),
    nextDatabase.collection("bookmarks").createIndex({ userId: 1, createdAt: -1 }),
  ]);
  await nextDatabase.collection("posts").updateMany(
    { category: { $nin: ["Технологи", "Амьдрал", "Урлаг", "Аялал", "Бодлого"] } },
    { $set: { category: "Амьдрал" } },
  );
  return nextDatabase;
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
