import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { POST_CATEGORIES } from "@contracts/covers";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  listPosts,
  findPostById,
  findPostsByAuthor,
  findRelatedPosts,
  createPost,
  updatePost,
  deletePost,
  endorsePost,
  recordPostView,
  hasEndorsed,
} from "./queries/posts";

const postInput = z.object({
  title: z.string().trim().min(3, "Гарчиг хамгийн багадаа 3 тэмдэгт").max(255),
  excerpt: z.string().trim().max(500).optional().default(""),
  content: z.string().trim().min(10, "Агуулга хамгийн багадаа 10 тэмдэгт"),
  category: z.enum(POST_CATEGORIES).default("Амьдрал"),
  coverImage: z.string().trim().max(500).nullish(),
});

function assertCanModify(
  post: { authorId: number },
  user: { id: number; role: string },
) {
  if (post.authorId !== user.id && user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Зөвхөн өөрийн нийтлэлийг засах/устгах боломжтой",
    });
  }
}

export const postRouter = createRouter({
  list: publicQuery
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(({ input }) => listPosts(input?.limit ?? 60)),

  byAuthor: publicQuery
    .input(z.object({ authorId: z.number().int().positive() }))
    .query(({ input }) => findPostsByAuthor(input.authorId)),

  related: publicQuery
    .input(z.object({ category: z.string().min(1), excludeId: z.number().int().positive() }))
    .query(({ input }) => findRelatedPosts(input.category, input.excludeId)),

  byId: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const post = await findPostById(input.id);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      return post;
    }),

  view: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const post = await findPostById(input.id);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      return recordPostView(input.id, ctx.user.id);
    }),

  hasEndorsed: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ ctx, input }) => hasEndorsed(input.id, ctx.user.id)),

  endorse: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const post = await findPostById(input.id);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      return endorsePost(input.id, ctx.user.id);
    }),

  mine: authedQuery.query(({ ctx }) => findPostsByAuthor(ctx.user.id)),

  create: authedQuery.input(postInput).mutation(({ ctx, input }) =>
    createPost({
      ...input,
      coverImage: input.coverImage ?? null,
      authorId: ctx.user.id,
    }),
  ),

  update: authedQuery
    .input(z.object({ id: z.number().int().positive() }).merge(postInput))
    .mutation(async ({ ctx, input }) => {
      const post = await findPostById(input.id);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      assertCanModify(post, ctx.user);
      const { id, ...data } = input;
      return updatePost(id, { ...data, coverImage: data.coverImage ?? null });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const post = await findPostById(input.id);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      assertCanModify(post, ctx.user);
      await deletePost(input.id);
      return { ok: true };
    }),
});
