export type UserRole = "user" | "admin";

export interface User {
  id: number;
  unionId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  passwordHash?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date;
}

export type InsertUser = Partial<Pick<User, "id" | "name" | "email" | "avatar" | "passwordHash" | "role" | "createdAt" | "updatedAt" | "lastSignInAt">> &
  Pick<User, "unionId">;

export interface Post {
  id: number;
  authorId: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string | null;
  endorsementCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  groupId?: number | null;
}

export interface PostView {
  postId: number;
  userId: number;
  createdAt: Date;
}

export interface PostEndorsement {
  postId: number;
  userId: number;
  createdAt: Date;
}

export interface Bookmark {
  postId: number;
  userId: number;
  createdAt: Date;
}

export type InsertPost = Partial<Pick<Post, "id" | "excerpt" | "category" | "coverImage" | "createdAt" | "updatedAt" | "groupId">> &
  Pick<Post, "authorId" | "title" | "content">;

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: Date;
}

export type InsertComment = Partial<Pick<Comment, "id" | "createdAt">> &
  Pick<Comment, "postId" | "authorId" | "content">;

export interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  authorId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GroupPrivacy = "public" | "private";
export type GroupMemberRole = "owner" | "admin" | "member";

export interface Group {
  id: number;
  name: string;
  description: string;
  privacy: GroupPrivacy;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  coverImage?: string | null;
}

export interface GroupMember {
  groupId: number;
  userId: number;
  role: GroupMemberRole;
  createdAt: Date;
}

export interface GroupInvite {
  id: number;
  groupId: number;
  inviterId: number;
  inviteeId: number;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
}

export type GroupJoinRequestStatus = "pending" | "approved" | "rejected";

export interface GroupJoinRequest {
  id: number;
  groupId: number;
  userId: number;
  status: GroupJoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = "new_post" | "group_join_request" | "group_member_joined" | "group_join_approved" | "group_invite" | "new_message";

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface Conversation {
  id: number;
  participantIds: [number, number];
  participantKey: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface DirectMessage {
  id: number;
  conversationId: number;
  senderId: number;
  recipientId: number;
  content: string;
  createdAt: Date;
  readAt: Date | null;
}
