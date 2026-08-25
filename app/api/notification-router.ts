import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./queries/notifications";

export const notificationRouter = createRouter({
  list: authedQuery.query(({ ctx }) => listNotifications(ctx.user.id)),
  read: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(ctx.user.id, input.id)),
  readAll: authedQuery.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
});