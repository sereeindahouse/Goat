import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getOrCreateConversation, listConversations, listMessages, sendMessage } from "./queries/messages";

export const messageRouter = createRouter({
  conversations: authedQuery.query(({ ctx }) => listConversations(ctx.user.id)),
  open: authedQuery.input(z.object({ userId: z.number().int().positive() })).query(({ ctx, input }) => getOrCreateConversation(ctx.user.id, input.userId)),
  byId: authedQuery.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => listMessages(input.id, ctx.user.id)),
  send: authedQuery.input(z.object({ recipientId: z.number().int().positive(), content: z.string().trim().min(1).max(5000) })).mutation(({ ctx, input }) => sendMessage(ctx.user.id, input.recipientId, input.content)),
});