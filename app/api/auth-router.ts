import * as cookie from "cookie";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import {
  createLocalUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
} from "./queries/users";
import { serializeSessionCookie, signSessionToken } from "./auth/session";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export const authRouter = createRouter({
    byId: publicQuery
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => findUserById(input.id)),
  login: publicQuery
    .input(z.object({
      email: z.string().trim().email(),
      password: z.string().min(6).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const existing = await findUserByEmail(email, true);
      if (!existing || !existing.passwordHash || !passwordMatches(input.password, existing.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Имэйл эсвэл нууц үг буруу байна." });
      }

      const user = existing;
      const token = await signSessionToken({ unionId: user.unionId, clientId: "local" });
      ctx.resHeaders.append("set-cookie", serializeSessionCookie(ctx.req.headers, token));
      const safeUser = { ...user } as typeof user & { passwordHash?: string };
      delete safeUser.passwordHash;
      return safeUser;
    }),
  register: publicQuery
    .input(z.object({
      email: z.string().trim().email(),
      name: z.string().trim().min(2).max(100),
      password: z.string().min(6).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      const existing = await findUserByEmail(email, true);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Энэ имэйл аль хэдийн бүртгэлтэй байна." });
      }

      const user = await createLocalUser({
        email,
        name: input.name,
        passwordHash: hashPassword(input.password),
      });
      const token = await signSessionToken({ unionId: user.unionId, clientId: "local" });
      ctx.resHeaders.append("set-cookie", serializeSessionCookie(ctx.req.headers, token));
      return user;
    }),
  updateProfile: authedQuery
    .input(z.object({
      name: z.string().trim().min(2).max(100),
      avatar: z.string().trim().max(1_500_000).refine(
        (value) => value === "" || value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://"),
        "Зургийн URL буруу байна.",
      ).nullable(),
    }))
    .mutation(({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
  me: authedQuery.query((opts) => opts.ctx.user),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
