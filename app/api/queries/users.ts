import type { InsertUser, User } from "@db/schema";
import { getDb, nextId } from "./connection";
import { env } from "../lib/env";

type UserCounter = { _id: string; value: number };

export async function findUserByUnionId(unionId: string) {
  const db = await getDb();
  return db.collection<User>("users").findOne({ unionId }, { projection: { _id: 0 } });
}

export async function findUserById(id: number) {
  const db = await getDb();
  return db.collection<User>("users").findOne(
    { id },
    { projection: { _id: 0, passwordHash: 0 } },
  );
}

export async function listSafeUsers() {
  const db = await getDb();
  return db.collection<User>("users").find(
    {},
    { projection: { _id: 0, passwordHash: 0 } },
  ).sort({ id: 1 }).toArray();
}

export async function searchUsers(query: string, limit = 20) {
  const db = await getDb();
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return db.collection<User>("users").find(
    { $or: [{ name: pattern }, { email: pattern }] },
    { projection: { _id: 0, passwordHash: 0 } },
  ).limit(limit).toArray();
}

export async function deleteUserById(requesterId: number, targetId: number) {
  const db = await getDb();
  const target = await db.collection<User>("users").findOne({ id: targetId });
  if (!target) return "not_found" as const;
  if (target.id === requesterId) return "self" as const;

  if (target.role === "admin") {
    const adminCount = await db.collection<User>("users").countDocuments({ role: "admin" });
    if (adminCount <= 1) return "last_admin" as const;
  }

  await db.collection<User>("users").deleteOne({ id: targetId });
  await compactUserIds();
  return "deleted" as const;
}

async function compactUserIds() {
  const db = await getDb();
  const users = await db.collection<User>("users").find({}, { projection: { _id: 0, id: 1 } }).sort({ id: 1 }).toArray();
  const references = [
    ["posts", "authorId"],
    ["postViews", "userId"],
    ["postEndorsements", "userId"],
    ["bookmarks", "userId"],
    ["comments", "authorId"],
    ["guestbook", "authorId"],
    ["groups", "ownerId"],
    ["groupMembers", "userId"],
    ["groupInvites", "inviterId"],
    ["groupInvites", "inviteeId"],
    ["groupJoinRequests", "userId"],
    ["notifications", "userId"],
    ["messages", "senderId"],
    ["messages", "recipientId"],
  ] as const;

  for (const [index, user] of users.entries()) {
    const nextId = index + 1;
    if (user.id === nextId) continue;
    for (const [collectionName, field] of references) {
      await db.collection(collectionName).updateMany({ [field]: user.id }, { $set: { [field]: nextId } });
    }
    await db.collection<User>("users").updateOne({ id: user.id }, { $set: { id: nextId } });
  }

  const conversations = await db.collection<{ id: number; participantIds: [number, number]; participantKey: string }>("conversations").find({}, { projection: { _id: 0 } }).toArray();
  for (const conversation of conversations) {
    const participantIds = conversation.participantIds.map((id) => users.findIndex((user) => user.id === id) + 1) as [number, number];
    const participantKey = [...participantIds].sort((first, second) => first - second).join(":");
    await db.collection("conversations").updateOne({ id: conversation.id }, { $set: { participantIds, participantKey } });
  }

  const maximumId = users.length;
  await db.collection<UserCounter>("_counters").updateOne({ _id: "users" }, { $set: { value: maximumId } }, { upsert: true });
}

export async function updateUserProfile(
  id: number,
  data: { name: string; avatar: string | null },
) {
  const db = await getDb();
  await db.collection<User>("users").updateOne(
    { id },
    { $set: { name: data.name, avatar: data.avatar, updatedAt: new Date() } },
  );
  return findUserById(id);
}

export async function findUserByEmail(email: string, includePassword = false) {
  const db = await getDb();
  return db.collection<User & { passwordHash?: string }>("users").findOne(
    { email: email.toLowerCase() },
    includePassword
      ? { projection: { _id: 0 } }
      : { projection: { _id: 0, passwordHash: 0 } },
  );
}

export async function createLocalUser(data: { email: string; name: string; passwordHash: string }) {
  const db = await getDb();
  const now = new Date();
  const user: User = {
    id: await nextId("users"),
    unionId: `local:${data.email.toLowerCase()}`,
    name: data.name,
    email: data.email.toLowerCase(),
    avatar: null,
    passwordHash: data.passwordHash,
    role: env.ownerEmail === data.email.toLowerCase() ? "admin" : "user",
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
  };
  await db.collection<User>("users").insertOne(user);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function upsertUser(data: InsertUser) {
  const db = await getDb();
  const now = new Date();
  const role = data.role ?? (data.unionId === env.ownerUnionId ? "admin" : "user");
  const values: User = {
    id: data.id ?? (await nextId("users")),
    unionId: data.unionId,
    name: data.name ?? null,
    email: data.email ?? null,
    avatar: data.avatar ?? null,
    role,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
    lastSignInAt: data.lastSignInAt ?? now,
  };

  await db.collection<User>("users").updateOne(
    { unionId: values.unionId },
    { $set: { ...values, updatedAt: now }, $setOnInsert: { createdAt: values.createdAt } },
    { upsert: true },
  );
}
