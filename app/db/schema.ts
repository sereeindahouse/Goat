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
  createdAt: Date;
  updatedAt: Date;
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
