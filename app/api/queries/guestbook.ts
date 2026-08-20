import type { GuestbookEntry } from "@db/schema";
import { getDb, nextId } from "./connection";

export async function listGuestbookEntries(): Promise<GuestbookEntry[]> {
  const db = await getDb();
  return db.collection<GuestbookEntry>("guestbook").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function findGuestbookEntryById(id: number) {
  const db = await getDb();
  return db.collection<GuestbookEntry>("guestbook").findOne({ id }, { projection: { _id: 0 } });
}

export async function createGuestbookEntry(data: { name: string; message: string; authorId: number | null }) {
  const db = await getDb();
  const now = new Date();
  const entry: GuestbookEntry = { ...data, id: await nextId("guestbook"), createdAt: now, updatedAt: now };
  await db.collection<GuestbookEntry>("guestbook").insertOne(entry);
  return entry;
}

export async function updateGuestbookEntry(id: number, data: { name: string; message: string }) {
  const db = await getDb();
  await db.collection<GuestbookEntry>("guestbook").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
  return findGuestbookEntryById(id);
}

export async function deleteGuestbookEntry(id: number) {
  const db = await getDb();
  await db.collection<GuestbookEntry>("guestbook").deleteOne({ id });
}