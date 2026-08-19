import type { InsertPost, Post, User } from "@db/schema";
import { getDb, nextId } from "./connection";

type PostWithAuthor = Post & { author: User };
export type FeedPost = PostWithAuthor & { commentCount: number };
type CommentCount = { _id: number; value: number };

async function withAuthorsAndCounts(rows: Post[]): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const authorIds = [...new Set(rows.map((post) => post.authorId))];
  const postIds = rows.map((post) => post.id);
  const [authors, commentCounts] = await Promise.all([
    db.collection<User>("users").find({ id: { $in: authorIds } }, { projection: { _id: 0 } }).toArray(),
    db.collection<CommentCount>("comments").aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", value: { $sum: 1 } } },
    ]).toArray(),
  ]);
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const countMap = new Map(commentCounts.map((count) => [count._id, count.value]));
  return rows.map((post) => ({
    ...post,
    author: authorMap.get(post.authorId)!,
    commentCount: countMap.get(post.id) ?? 0,
  }));
}

export async function listPosts(limit = 60) {
  const db = await getDb();
  const rows = await db.collection<Post>("posts").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return withAuthorsAndCounts(rows);
}

export async function findPostsByAuthor(authorId: number) {
  const db = await getDb();
  const rows = await db.collection<Post>("posts").find({ authorId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return withAuthorsAndCounts(rows);
}

export async function findRelatedPosts(category: string, excludeId: number, limit = 3) {
  const db = await getDb();
  const sameCategory = await db.collection<Post>("posts").find(
    { category, id: { $ne: excludeId } },
    { projection: { _id: 0 } },
  ).sort({ createdAt: -1 }).limit(limit).toArray();

  if (sameCategory.length >= limit) return withAuthorsAndCounts(sameCategory);

  const existingIds = [excludeId, ...sameCategory.map((post) => post.id)];
  const fallback = await db.collection<Post>("posts").find(
    { id: { $nin: existingIds } },
    { projection: { _id: 0 } },
  ).sort({ createdAt: -1 }).limit(limit - sameCategory.length).toArray();

  return withAuthorsAndCounts([...sameCategory, ...fallback]);
}

export async function findPostById(id: number): Promise<PostWithAuthor | null> {
  const db = await getDb();
  const post = await db.collection<Post>("posts").findOne({ id }, { projection: { _id: 0 } });
  if (!post) return null;
  const author = await db.collection<User>("users").findOne({ id: post.authorId }, { projection: { _id: 0 } });
  return { ...post, author: author! };
}

export async function createPost(data: InsertPost) {
  const db = await getDb();
  const now = new Date();
  const post: Post = {
    id: data.id ?? (await nextId("posts")),
    authorId: data.authorId,
    title: data.title,
    excerpt: data.excerpt ?? "",
    content: data.content,
    category: data.category ?? "Амьдрал",
    coverImage: data.coverImage ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  };
  await db.collection<Post>("posts").insertOne(post);
  return findPostById(post.id);
}

export async function updatePost(id: number, data: Partial<Pick<InsertPost, "title" | "excerpt" | "content" | "category" | "coverImage">>) {
  const db = await getDb();
  await db.collection<Post>("posts").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
  return findPostById(id);
}

export async function deletePost(id: number) {
  const db = await getDb();
  await db.collection("comments").deleteMany({ postId: id });
  await db.collection("posts").deleteOne({ id });
}
