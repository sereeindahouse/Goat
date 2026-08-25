import type { Conversation, DirectMessage, User } from "@db/schema";
import { getDb, nextId } from "./connection";
import { createNotification } from "./notifications";

function pairKey(firstId: number, secondId: number) {
  return [firstId, secondId].sort((a, b) => a - b) as [number, number];
}

function participantKey(firstId: number, secondId: number) {
  return pairKey(firstId, secondId).join(":");
}

async function getOrCreateConversation(firstId: number, secondId: number) {
  const db = await getDb();
  const participantIds = pairKey(firstId, secondId);
  const key = participantKey(firstId, secondId);
  let conversation: Conversation | null = await db.collection<Conversation>("conversations").findOne({ participantKey: key }, { projection: { _id: 0 } });
  if (!conversation) {
    const now = new Date();
    const created: Conversation = { id: await nextId("conversations"), participantIds, participantKey: key, createdAt: now, updatedAt: now };
    await db.collection<Conversation>("conversations").insertOne(created);
    conversation = created;
  }
  return conversation;
}

export async function listConversations(userId: number) {
  const db = await getDb();
  const conversations = await db.collection<Conversation>("conversations").find({ participantIds: userId }, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
  const otherIds = conversations.map((conversation) => conversation.participantIds.find((id) => id !== userId)!);
  const users = await db.collection<User>("users").find({ id: { $in: otherIds } }, { projection: { _id: 0, id: 1, name: 1, avatar: 1 } }).toArray();
  const userMap = new Map(users.map((user) => [user.id, user]));
  const lastMessages = await Promise.all(conversations.map((conversation) => db.collection<DirectMessage>("messages").findOne({ conversationId: conversation.id }, { sort: { createdAt: -1 }, projection: { _id: 0 } })));
  return conversations.map((conversation, index) => ({ ...conversation, user: userMap.get(otherIds[index]), lastMessage: lastMessages[index] }));
}

export async function listMessages(conversationId: number, userId: number) {
  const db = await getDb();
  const conversation = await db.collection<Conversation>("conversations").findOne({ id: conversationId, participantIds: userId }, { projection: { _id: 0 } });
  if (!conversation) return null;
  const otherUserId = conversation.participantIds.find((id) => id !== userId);
  const otherUser = otherUserId
    ? await db.collection<User>("users").findOne({ id: otherUserId }, { projection: { _id: 0, id: 1, name: 1, avatar: 1 } })
    : null;
  const messages = await db.collection<DirectMessage>("messages").find({ conversationId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).limit(200).toArray();
  await db.collection<DirectMessage>("messages").updateMany({ conversationId, recipientId: userId, readAt: null }, { $set: { readAt: new Date() } });
  return { conversation, messages, otherUser };
}

export async function sendMessage(senderId: number, recipientId: number, content: string) {
  if (senderId === recipientId) throw new Error("Өөртөө message илгээх боломжгүй.");
  const db = await getDb();
  const recipient = await db.collection<User>("users").findOne({ id: recipientId }, { projection: { _id: 0, id: 1, name: 1 } });
  if (!recipient) return null;
  const conversation = await getOrCreateConversation(senderId, recipientId);
  const message: DirectMessage = { id: await nextId("messages"), conversationId: conversation.id, senderId, recipientId, content, createdAt: new Date(), readAt: null };
  await db.collection<DirectMessage>("messages").insertOne(message);
  await db.collection<Conversation>("conversations").updateOne({ id: conversation.id }, { $set: { updatedAt: message.createdAt } });
  await createNotification({ userId: recipientId, type: "new_message", title: "Шинэ message", message: "Танд шинэ message ирлээ.", link: `/messages/${conversation.id}` });
  return { conversation, message };
}

export { getOrCreateConversation };