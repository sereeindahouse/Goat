import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { answerBlogQuestion } from "./ai-service";

export const aiRouter = createRouter({
  chat: publicQuery
    .input(z.object({ message: z.string().trim().min(1, "Асуултаа бичнэ үү").max(1000, "Асуулт хэт урт байна") }))
    .mutation(async ({ input }) => {
      try {
        return await answerBlogQuestion(input.message);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI хариу өгөх боломжгүй байна";
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message });
      }
    }),
});