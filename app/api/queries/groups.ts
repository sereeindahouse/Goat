import type { Group, GroupInvite, GroupJoinRequest, GroupMember, GroupMemberRole, User } from "@db/schema";
import { getDb, nextId } from "./connection";
import { createNotifications } from "./notifications";

export type GroupWithOwner = Group & { owner: Pick<User, "id" | "name" | "avatar">; memberCount: number };

async function memberRole(groupId: number, userId?: number) {
  if (!userId) return null;
  const db = await getDb();
  return db.collection<GroupMember>("groupMembers").findOne({ groupId, userId }, { projection: { _id: 0 } });
}

async function withOwner(group: Group): Promise<GroupWithOwner> {
  const db = await getDb();
  const [owner, memberCount] = await Promise.all([
    db.collection<User>("users").findOne({ id: group.ownerId }, { projection: { _id: 0, id: 1, name: 1, avatar: 1 } }),
    db.collection<GroupMember>("groupMembers").countDocuments({ groupId: group.id }),
  ]);
  return { ...group, owner: owner!, memberCount };
}

export async function listGroups(_userId?: number) {
  const db = await getDb();
  const groups = await db.collection<Group>("groups").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return Promise.all(groups.map(withOwner));
}

export async function getGroup(id: number, userId?: number) {
  const db = await getDb();
  const group = await db.collection<Group>("groups").findOne({ id }, { projection: { _id: 0 } });
  if (!group) return null;
  const membership = await memberRole(id, userId);
  if (group.privacy === "private" && !membership) {
    return { ...(await withOwner(group)), role: null, members: [], joinRequests: [] };
  }
  const members = await db.collection<GroupMember>("groupMembers").find({ groupId: id }, { projection: { _id: 0 } }).toArray();
  const users = await db.collection<User>("users").find({ id: { $in: members.map((item) => item.userId) } }, { projection: { _id: 0, passwordHash: 0 } }).toArray();
  const userMap = new Map(users.map((user) => [user.id, user]));
  const joinRequests = membership && (membership.role === "owner" || membership.role === "admin")
    ? await db.collection<GroupJoinRequest>("groupJoinRequests").find({ groupId: id, status: "pending" }, { projection: { _id: 0 } }).toArray()
    : [];
  const requestUsers = await db.collection<User>("users").find({ id: { $in: joinRequests.map((item) => item.userId) } }, { projection: { _id: 0, id: 1, name: 1, avatar: 1 } }).toArray();
  const requestUserMap = new Map(requestUsers.map((user) => [user.id, user]));
  return { ...(await withOwner(group)), role: membership?.role ?? null, members: members.map((item) => ({ ...item, user: userMap.get(item.userId)! })), joinRequests: joinRequests.map((item) => ({ ...item, user: requestUserMap.get(item.userId)! })) };
}

export async function getGroupForJoin(id: number, userId: number) {
  const db = await getDb();
  const group = await db.collection<Group>("groups").findOne({ id }, { projection: { _id: 0 } });
  if (!group) return null;
  const membership = await memberRole(id, userId);
  return { ...group, role: membership?.role ?? null };
}

export async function canViewGroupPosts(groupId: number, userId?: number) {
  const db = await getDb();
  const group = await db.collection<Group>("groups").findOne({ id: groupId }, { projection: { _id: 0, privacy: 1 } });
  if (!group) return false;
  if (group.privacy === "public") return true;
  return !!(await memberRole(groupId, userId));
}

export async function createGroup(data: { name: string; description: string; privacy: Group["privacy"]; coverImage?: string | null; ownerId: number }) {
  const db = await getDb();
  const now = new Date();
  const group: Group = { id: await nextId("groups"), name: data.name, description: data.description, privacy: data.privacy, coverImage: data.coverImage ?? null, ownerId: data.ownerId, createdAt: now, updatedAt: now };
  await db.collection<Group>("groups").insertOne(group);
  await db.collection<GroupMember>("groupMembers").insertOne({ groupId: group.id, userId: data.ownerId, role: "owner", createdAt: now });
  return getGroup(group.id, data.ownerId);
}

export async function addMember(groupId: number, userId: number, role: GroupMemberRole = "member") {
  const db = await getDb();
  await db.collection<GroupMember>("groupMembers").updateOne({ groupId, userId }, { $set: { groupId, userId, role }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  return true;
}

export async function removeMember(groupId: number, userId: number) {
  const db = await getDb();
  await db.collection<GroupMember>("groupMembers").deleteOne({ groupId, userId });
  return true;
}

export async function createInvite(groupId: number, inviterId: number, inviteeId: number) {
  const db = await getDb();
  const invite: GroupInvite = { id: await nextId("groupInvites"), groupId, inviterId, inviteeId, status: "pending", createdAt: new Date() };
  await db.collection<GroupInvite>("groupInvites").updateOne({ groupId, inviteeId, status: "pending" }, { $set: invite }, { upsert: true });
  await createNotifications([inviteeId], { type: "group_invite", title: "Group invitation", message: "Таныг group-д урьсан байна.", link: `/groups/${groupId}` });
  return invite;
}

export async function acceptInvite(id: number, userId: number) {
  const db = await getDb();
  const invite = await db.collection<GroupInvite>("groupInvites").findOne({ id, inviteeId: userId, status: "pending" });
  if (!invite) return false;
  await addMember(invite.groupId, userId);
  await db.collection<GroupInvite>("groupInvites").updateOne({ id }, { $set: { status: "accepted" } });
  const group = await db.collection<Group>("groups").findOne({ id: invite.groupId }, { projection: { _id: 0 } });
  if (group) {
    const members = await db.collection<GroupMember>("groupMembers").find({ groupId: group.id }, { projection: { userId: 1 } }).toArray();
    await createNotifications(members.map((member) => member.userId), { type: "group_member_joined", title: "Шинэ group гишүүн", message: `Group-д шинэ гишүүн нэмэгдлээ: ${userId}`, link: `/groups/${group.id}` });
  }
  return true;
}

export async function requestToJoin(groupId: number, userId: number) {
  const db = await getDb();
  const existing = await db.collection<GroupJoinRequest>("groupJoinRequests").findOne({ groupId, userId, status: "pending" }, { projection: { _id: 0 } });
  if (existing) return existing;
  const now = new Date();
  const request: GroupJoinRequest = { id: await nextId("groupJoinRequests"), groupId, userId, status: "pending", createdAt: now, updatedAt: now };
  await db.collection<GroupJoinRequest>("groupJoinRequests").insertOne(request);
  const members = await db.collection<GroupMember>("groupMembers").find({ groupId, role: { $in: ["owner", "admin"] } }, { projection: { userId: 1 } }).toArray();
  await createNotifications(members.map((member) => member.userId), { type: "group_join_request", title: "Group join request", message: `Шинэ хэрэглэгч group-д нэгдэх хүсэлт илгээлээ.`, link: `/groups/${groupId}` });
  return request;
}

export async function approveJoinRequest(groupId: number, requestId: number, approverId: number, approved: boolean) {
  const db = await getDb();
  const request = await db.collection<GroupJoinRequest>("groupJoinRequests").findOne({ id: requestId, groupId, status: "pending" }, { projection: { _id: 0 } });
  if (!request) return false;
  const status = approved ? "approved" : "rejected";
  await db.collection<GroupJoinRequest>("groupJoinRequests").updateOne({ id: requestId }, { $set: { status, updatedAt: new Date() } });
  const group = await db.collection<Group>("groups").findOne({ id: groupId }, { projection: { _id: 0 } });
  if (!group) return false;
  if (approved) {
    await addMember(groupId, request.userId);
    const members = await db.collection<GroupMember>("groupMembers").find({ groupId }, { projection: { userId: 1 } }).toArray();
    await createNotifications(members.map((member) => member.userId), { type: "group_member_joined", title: "Шинэ group гишүүн", message: "Шинэ гишүүн group-д нэмэгдлээ.", link: `/groups/${groupId}` });
    await createNotifications([request.userId], { type: "group_join_approved", title: "Group join зөвшөөрөгдлөө", message: `${group.name} group-д таны хүсэлтийг зөвшөөрлөө.`, link: `/groups/${groupId}` });
  } else {
    await createNotifications([request.userId], { type: "group_join_approved", title: "Group join хүсэлт татгалзлаа", message: `${group.name} group-д нэгдэх хүсэлтийг татгалзлаа.`, link: `/groups/${groupId}` });
  }
  return { status, requestId, approverId };
}

export async function listInvites(userId: number) {
  const db = await getDb();
  return db.collection<GroupInvite>("groupInvites").find({ inviteeId: userId, status: "pending" }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function getMemberRole(groupId: number, userId: number) {
  return memberRole(groupId, userId);
}
