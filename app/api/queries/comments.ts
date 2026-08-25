import type { Comment, User } from "@db/schema";
import { getDb, nextId } from "./connection";

type CommentWithAuthor = Comment & { author: User };

export async function listCommentsByPost(postId: number): Promise<CommentWithAuthor[]> {
  const db = await getDb();
  const comments = await db.collection<Comment>("comments").find({ postId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
  const authorIds = [...new Set(comments.map((comment) => comment.authorId))];
  const authors = await db.collection<User>("users").find({ id: { $in: authorIds } }, { projection: { _id: 0, passwordHash: 0 } }).toArray();
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  return comments.map((comment) => ({ ...comment, author: authorMap.get(comment.authorId)! }));
}

export async function findCommentById(id: number) {
  const db = await getDb();
  const comment = await db.collection<Comment>("comments").findOne({ id }, { projection: { _id: 0 } });
  if (!comment) return null;
  const post = await db.collection("posts").findOne({ id: comment.postId }, { projection: { _id: 0 } });
  return { ...comment, post };
}

export async function createComment(data: { postId: number; authorId: number; content: string }) {
  const db = await getDb();
  const comment: Comment = { ...data, id: await nextId("comments"), createdAt: new Date() };
  await db.collection<Comment>("comments").insertOne(comment);
  const author = await db.collection<User>("users").findOne({ id: comment.authorId }, { projection: { _id: 0, passwordHash: 0 } });
  return { ...comment, author: author! };
}

export async function deleteComment(id: number) {
  const db = await getDb();
  await db.collection<Comment>("comments").deleteOne({ id });
}
