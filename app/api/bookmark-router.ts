import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { isBookmarked, listBookmarkedPosts, toggleBookmark } from "./queries/bookmarks";
import { findPostById } from "./queries/posts";

export const bookmarkRouter = createRouter({
  list: authedQuery.query(({ ctx }) => listBookmarkedPosts(ctx.user.id)),

  isBookmarked: authedQuery
    .input(z.object({ postId: z.number().int().positive() }))
    .query(({ ctx, input }) => isBookmarked(input.postId, ctx.user.id)),

  toggle: authedQuery
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const post = await findPostById(input.postId);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Нийтлэл олдсонгүй" });
      }
      return toggleBookmark(input.postId, ctx.user.id);
    }),
});
