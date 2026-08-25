import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { answerBlogQuestion, generateWritingAssist, type WritingAssistAction } from "./ai-service";

export const aiRouter = createRouter({
  chat: authedQuery
    .input(z.object({ message: z.string().trim().min(1, "Асуултаа бичнэ үү").max(1000, "Асуулт хэт урт байна") }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await answerBlogQuestion(input.message, ctx.user);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI хариу өгөх боломжгүй байна";
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message });
      }
    }),
  writingAssist: authedQuery
    .input(z.object({
      action: z.enum(["title", "excerpt", "proofread"] satisfies [WritingAssistAction, ...WritingAssistAction[]]),
      title: z.string().max(255),
      content: z.string().min(10).max(20000),
    }))
    .mutation(async ({ input }) => {
      try {
        return await generateWritingAssist(input.action, input.title, input.content);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI хариу өгөх боломжгүй байна";
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message });
      }
    }),
  postSummary: publicQuery
    .input(z.object({ title: z.string().max(255), content: z.string().min(10).max(20000) }))
    .mutation(async ({ input }) => {
      try {
        return await generateWritingAssist("summary", input.title, input.content);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI хариу өгөх боломжгүй байна";
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message });
      }
    }),
});