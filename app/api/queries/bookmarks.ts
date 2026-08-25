import type { Bookmark, Post } from "@db/schema";
import { getDb } from "./connection";
import { withAuthorsAndCounts, type FeedPost } from "./posts";

export async function isBookmarked(postId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  const bookmark = await db.collection<Bookmark>("bookmarks").findOne(
    { postId, userId },
    { projection: { _id: 1 } },
  );
  return !!bookmark;
}

export async function toggleBookmark(postId: number, userId: number): Promise<{ bookmarked: boolean }> {
  const db = await getDb();
  const existing = await db.collection<Bookmark>("bookmarks").findOne({ postId, userId });
  if (existing) {
    await db.collection<Bookmark>("bookmarks").deleteOne({ postId, userId });
    return { bookmarked: false };
  }

  try {
    await db.collection<Bookmark>("bookmarks").insertOne({
      postId,
      userId,
      createdAt: new Date(),
    });
    return { bookmarked: true };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return { bookmarked: true };
    }
    throw error;
  }
}

export async function listBookmarkedPosts(userId: number): Promise<FeedPost[]> {
  const db = await getDb();
  const bookmarks = await db.collection<Bookmark>("bookmarks")
    .find({ userId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  if (bookmarks.length === 0) return [];
  const postIds = bookmarks.map((b) => b.postId);
  const rows = await db.collection<Post>("posts")
    .find({ id: { $in: postIds } }, { projection: { _id: 0 } })
    .toArray();

  const postMap = new Map(rows.map((p) => [p.id, p]));
  const orderedRows = postIds
    .map((id) => postMap.get(id))
    .filter((post): post is NonNullable<typeof post> => post !== undefined);

  return withAuthorsAndCounts(orderedRows);
}
