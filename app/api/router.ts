import { authRouter } from "./auth-router";
import { postRouter } from "./post-router";
import { commentRouter } from "./comment-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  post: postRouter,
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;
