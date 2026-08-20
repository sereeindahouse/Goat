import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import {
  createGuestbookEntry,
  deleteGuestbookEntry,
  findGuestbookEntryById,
  listGuestbookEntries,
  updateGuestbookEntry,
} from "./queries/guestbook";

const entryInput = z.object({
  name: z.string().trim().min(1, "Нэрээ оруулна уу").max(80, "Нэр 80 тэмдэгтээс урт байж болохгүй"),
  message: z.string().trim().min(1, "Мессежээ оруулна уу").max(500, "Мессеж 500 тэмдэгтээс урт байж болохгүй"),
});

export const guestbookRouter = createRouter({
  list: publicQuery.query(() => listGuestbookEntries()),

  create: publicQuery.input(entryInput).mutation(({ ctx, input }) =>
    createGuestbookEntry({ ...input, authorId: ctx.user?.id ?? null }),
  ),

  update: authedQuery.input(entryInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const entry = await findGuestbookEntryById(input.id);
    if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Зочны дэвтрийн бичлэг олдсонгүй" });
    if (entry.authorId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Энэ бичлэгийг засах эрхгүй" });
    }
    return updateGuestbookEntry(input.id, { name: input.name, message: input.message });
  }),

  delete: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const entry = await findGuestbookEntryById(input.id);
    if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Зочны дэвтрийн бичлэг олдсонгүй" });
    if (entry.authorId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Энэ бичлэгийг устгах эрхгүй" });
    }
    await deleteGuestbookEntry(input.id);
    return { ok: true };
  }),
});