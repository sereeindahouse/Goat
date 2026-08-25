import type { InsertUser, User } from "@db/schema";
import { getDb, nextId } from "./connection";
import { env } from "../lib/env";

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
  return "deleted" as const;
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
