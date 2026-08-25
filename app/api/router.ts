import { authRouter } from "./auth-router";
import { postRouter } from "./post-router";
import { commentRouter } from "./comment-router";
import { guestbookRouter } from "./guestbook-router";
import { aiRouter } from "./ai-router";
import { groupRouter } from "./group-router";
import { notificationRouter } from "./notification-router";
import { messageRouter } from "./message-router";
import { bookmarkRouter } from "./bookmark-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  post: postRouter,
  comment: commentRouter,
  guestbook: guestbookRouter,
  ai: aiRouter,
  group: groupRouter,
  notification: notificationRouter,
  message: messageRouter,
  bookmark: bookmarkRouter,
});

export type AppRouter = typeof appRouter;
