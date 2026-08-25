import type { Notification } from "@db/schema";
import { getDb, nextId } from "./connection";

export async function createNotification(data: Omit<Notification, "id" | "createdAt" | "readAt">) {
  const db = await getDb();
  const notification: Notification = { ...data, id: await nextId("notifications"), readAt: null, createdAt: new Date() };
  await db.collection<Notification>("notifications").insertOne(notification);
  return notification;
}

export async function createNotifications(userIds: number[], data: Omit<Notification, "id" | "userId" | "createdAt" | "readAt">) {
  await Promise.all([...new Set(userIds)].map((userId) => createNotification({ ...data, userId })));
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  return db.collection<Notification>("notifications").find({ userId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function markNotificationRead(userId: number, id: number) {
  const db = await getDb();
  await db.collection<Notification>("notifications").updateOne({ id, userId }, { $set: { readAt: new Date() } });
  return { ok: true };
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  await db.collection<Notification>("notifications").updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return { ok: true };
}