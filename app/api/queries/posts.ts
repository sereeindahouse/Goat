import type { Comment, Group, GroupMember, InsertPost, Post, PostEndorsement, PostView, User } from "@db/schema";
import { getDb, nextId } from "./connection";
import { createNotifications } from "./notifications";

type PostWithAuthor = Post & { author: User };
export type FeedPost = PostWithAuthor & {
  commentCount: number;
  highlightComment: CommentPreview | null;
  group: Pick<Group, "id" | "name" | "privacy"> | null;
};
type CommentCount = { _id: number; value: number };
type CommentPreview = Pick<Comment, "postId" | "content" | "createdAt"> & { author: Pick<User, "name" | "avatar"> };

async function visibleGroupIds(user?: Pick<User, "id" | "role">) {
  const db = await getDb();
  if (user?.role === "admin") return null;
  const publicGroups = await db.collection<Group>("groups").find({ privacy: "public" }, { projection: { _id: 0, id: 1 } }).toArray();
  const memberships = user?.id
    ? await db.collection<GroupMember>("groupMembers").find({ userId: user.id }, { projection: { _id: 0, groupId: 1 } }).toArray()
    : [];
  return [...new Set([...publicGroups.map((group) => group.id), ...memberships.map((membership) => membership.groupId)])];
}

export async function withAuthorsAndCounts(rows: Post[]): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const authorIds = [...new Set(rows.map((post) => post.authorId))];
  const postIds = rows.map((post) => post.id);
  const [authors, commentCounts, comments, groups] = await Promise.all([
    db.collection<User>("users").find({ id: { $in: authorIds } }, { projection: { _id: 0, passwordHash: 0 } }).toArray(),
    db.collection<CommentCount>("comments").aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", value: { $sum: 1 } } },
    ]).toArray(),
    db.collection<Comment>("comments").find({ postId: { $in: postIds } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
    db.collection<Group>("groups").find({ id: { $in: rows.flatMap((post) => post.groupId ? [post.groupId] : []) } }, { projection: { _id: 0, id: 1, name: 1, privacy: 1 } }).toArray(),
  ]);
  const authorMap = new Map(authors.map((author) => [author.id, author]));
  const countMap = new Map(commentCounts.map((count) => [count._id, count.value]));
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const commentAuthorIds = [...new Set(comments.map((comment) => comment.authorId))];
  const commentAuthors = await db.collection<User>("users").find({ id: { $in: commentAuthorIds } }, { projection: { _id: 0, id: 1, name: 1, avatar: 1 } }).toArray();
  const commentAuthorMap = new Map(commentAuthors.map((author) => [author.id, author]));
  const previewMap = new Map<number, CommentPreview>();
  comments.forEach((comment) => {
    if (!previewMap.has(comment.postId)) {
      const author = commentAuthorMap.get(comment.authorId);
      if (author) previewMap.set(comment.postId, { postId: comment.postId, content: comment.content, createdAt: comment.createdAt, author });
    }
  });
  return rows.map((post) => ({
    ...post,
    endorsementCount: post.endorsementCount ?? 0,
    viewCount: post.viewCount ?? 0,
    author: authorMap.get(post.authorId)!,
    commentCount: countMap.get(post.id) ?? 0,
    highlightComment: previewMap.get(post.id) ?? null,
    group: post.groupId ? groupMap.get(post.groupId) ?? null : null,
  }));
}

export async function listPosts(limit = 60, user?: Pick<User, "id" | "role">) {
  const db = await getDb();
  const allowedGroupIds = await visibleGroupIds(user);
  const visibility = allowedGroupIds === null ? {} : { $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: { $in: allowedGroupIds } }] };
  const rows = await db.collection<Post>("posts").find(visibility, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return withAuthorsAndCounts(rows);
}

export async function listGroupPosts(groupId: number, limit = 60) {
  const db = await getDb();
  const rows = await db.collection<Post>("posts").find({ groupId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return withAuthorsAndCounts(rows);
}

export async function findPostsByAuthor(authorId: number, user?: Pick<User, "id" | "role">) {
  const db = await getDb();
  const allowedGroupIds = await visibleGroupIds(user);
  const visibility = allowedGroupIds === null ? {} : { $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: { $in: allowedGroupIds } }] };
  const rows = await db.collection<Post>("posts").find({ authorId, ...visibility }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return withAuthorsAndCounts(rows);
}

export async function findRelatedPosts(category: string, excludeId: number, limit = 3, user?: Pick<User, "id" | "role">) {
  const db = await getDb();
  const allowedGroupIds = await visibleGroupIds(user);
  const visibility = allowedGroupIds === null ? {} : { $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: { $in: allowedGroupIds } }] };
  const sameCategory = await db.collection<Post>("posts").find(
    { category, id: { $ne: excludeId }, ...visibility },
    { projection: { _id: 0 } },
  ).sort({ createdAt: -1 }).limit(limit).toArray();

  if (sameCategory.length >= limit) return withAuthorsAndCounts(sameCategory);

  const existingIds = [excludeId, ...sameCategory.map((post) => post.id)];
  const fallback = await db.collection<Post>("posts").find(
    { id: { $nin: existingIds }, ...visibility },
    { projection: { _id: 0 } },
  ).sort({ createdAt: -1 }).limit(limit - sameCategory.length).toArray();

  return withAuthorsAndCounts([...sameCategory, ...fallback]);
}

export async function findPostById(id: number): Promise<PostWithAuthor | null> {
  const db = await getDb();
  const post = await db.collection<Post>("posts").findOne({ id }, { projection: { _id: 0 } });
  if (!post) return null;
  const author = await db.collection<User>("users").findOne({ id: post.authorId }, { projection: { _id: 0, passwordHash: 0 } });
  return {
    ...post,
    endorsementCount: post.endorsementCount ?? 0,
    viewCount: post.viewCount ?? 0,
    author: author!,
  };
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
    groupId: data.groupId ?? null,
    endorsementCount: 0,
    viewCount: 0,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  };
  await db.collection<Post>("posts").insertOne(post);
  const recipientIds = post.groupId
    ? (await db.collection<GroupMember>("groupMembers").find({ groupId: post.groupId }, { projection: { userId: 1 } }).toArray()).map((member) => member.userId)
    : (await db.collection<User>("users").find({}, { projection: { id: 1 } }).toArray()).map((user) => user.id);
  await createNotifications(recipientIds.filter((userId) => userId !== post.authorId), {
    type: "new_post",
    title: "Шинэ нийтлэл",
    message: post.groupId ? "Таны group-д шинэ нийтлэл нэмэгдлээ." : `${post.title} нийтлэл шинээр нийтлэгдлээ.`,
    link: `/post/${post.id}`,
  });
  return findPostById(post.id);
}

export async function updatePost(id: number, data: Partial<Pick<InsertPost, "title" | "excerpt" | "content" | "category" | "coverImage">>) {
  const db = await getDb();
  await db.collection<Post>("posts").updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
  return findPostById(id);
}

export async function endorsePost(id: number, userId: number) {
  const db = await getDb();
  try {
    await db.collection<PostEndorsement>("postEndorsements").insertOne({
      postId: id,
      userId,
      createdAt: new Date(),
    });
    await db.collection<Post>("posts").updateOne({ id }, { $inc: { endorsementCount: 1 } });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
  }
  return findPostById(id);
}

export async function recordPostView(id: number, userId: number) {
  const db = await getDb();
  try {
    await db.collection<PostView>("postViews").insertOne({
      postId: id,
      userId,
      createdAt: new Date(),
    });
    await db.collection<Post>("posts").updateOne({ id }, { $inc: { viewCount: 1 } });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
  }
  return findPostById(id);
}

export async function hasEndorsed(id: number, userId: number) {
  const db = await getDb();
  return !!(await db.collection<PostEndorsement>("postEndorsements").findOne({ postId: id, userId }, { projection: { _id: 1 } }));
}

export async function deletePost(id: number) {
  const db = await getDb();
  await db.collection("comments").deleteMany({ postId: id });
  await db.collection("postViews").deleteMany({ postId: id });
  await db.collection("postEndorsements").deleteMany({ postId: id });
  await db.collection("bookmarks").deleteMany({ postId: id });
  await db.collection("posts").deleteOne({ id });
}
