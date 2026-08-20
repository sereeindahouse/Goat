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

export type InsertPost = Partial<Pick<Post, "id" | "excerpt" | "category" | "coverImage" | "createdAt" | "updatedAt">> &
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
