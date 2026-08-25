import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  listCommentsByPost,
  findCommentById,
  createComment,
  deleteComment,
} from "./queries/comments";
import { findPostById } from "./queries/posts";
import { canViewGroupPosts } from "./queries/groups";

export const commentRouter = createRouter({
  listByPost: publicQuery
    .input(z.object({ postId: z.number().int().positive() }))
    .query(({ input }) => listCommentsByPost(input.postId)),

  create: authedQuery
    .input(
      z.object({
        postId: z.number().int().positive(),
        content: z
          .string()
          .trim()
          .min(1, "Сэтгэгдэл хоосон байж болохгүй")
          .max(2000, "Сэтгэгдэл хэт урт байна"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const post = await findPostById(input.postId);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      if (post.groupId && !(await canViewGroupPosts(post.groupId, ctx.user.id))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Энэ нийтлэлд сэтгэгдэл бичих эрхгүй" });
      }
      return createComment({
        postId: input.postId,
        authorId: ctx.user.id,
        content: input.content,
      });
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await findCommentById(input.id);
      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Сэтгэгдэл олдсонгүй" });
      }
      const isOwn = comment.authorId === ctx.user.id;
      const isPostAuthor = comment.post?.authorId === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      if (!isOwn && !isPostAuthor && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Энэ сэтгэгдлийг устгах эрхгүй",
        });
      }
      await deleteComment(input.id);
      return { ok: true };
    }),
});
