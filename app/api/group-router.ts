import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { addMember, acceptInvite, approveJoinRequest, createGroup, createInvite, getGroup, getGroupForJoin, getMemberRole, listGroups, listInvites, removeMember, requestToJoin } from "./queries/groups";
import { findUserById } from "./queries/users";

async function assertManager(groupId: number, userId: number) {
  const role = await getMemberRole(groupId, userId);
  if (!role || (role.role !== "owner" && role.role !== "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Зөвхөн group owner эсвэл admin энэ үйлдлийг хийж болно." });
  }
  return role;
}

export const groupRouter = createRouter({
  list: publicQuery.query(({ ctx }) => listGroups(ctx.user?.id)),
  byId: publicQuery.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const group = await getGroup(input.id, ctx.user?.id);
    if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group олдсонгүй эсвэл private group байна." });
    return group;
  }),
  create: authedQuery.input(z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(1000).default(""), privacy: z.enum(["public", "private"]), coverImage: z.string().trim().max(1_500_000).nullable().optional() })).mutation(({ ctx, input }) => createGroup({ ...input, ownerId: ctx.user.id })),
  addMember: authedQuery.input(z.object({ groupId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertManager(input.groupId, ctx.user.id);
    if (!(await findUserById(input.userId))) throw new TRPCError({ code: "NOT_FOUND", message: "Хэрэглэгч олдсонгүй." });
    await addMember(input.groupId, input.userId);
    return getGroup(input.groupId, ctx.user.id);
  }),
  invite: authedQuery.input(z.object({ groupId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertManager(input.groupId, ctx.user.id);
    if (!(await findUserById(input.userId))) throw new TRPCError({ code: "NOT_FOUND", message: "Хэрэглэгч олдсонгүй." });
    return createInvite(input.groupId, ctx.user.id, input.userId);
  }),
  removeMember: authedQuery.input(z.object({ groupId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertManager(input.groupId, ctx.user.id);
    const target = await getMemberRole(input.groupId, input.userId);
    if (!target || target.role === "owner") throw new TRPCError({ code: "BAD_REQUEST", message: "Owner-ийг group-оос хасах боломжгүй." });
    await removeMember(input.groupId, input.userId);
    return { ok: true };
  }),
  join: authedQuery.input(z.object({ groupId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const group = await getGroupForJoin(input.groupId, ctx.user.id);
    if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group олдсонгүй." });
    if (group.role) return group;
    await requestToJoin(input.groupId, ctx.user.id);
    return { requested: true };
  }),
  approveJoin: authedQuery.input(z.object({ groupId: z.number().int().positive(), requestId: z.number().int().positive(), approved: z.boolean() })).mutation(async ({ ctx, input }) => {
    await assertManager(input.groupId, ctx.user.id);
    return approveJoinRequest(input.groupId, input.requestId, ctx.user.id, input.approved);
  }),
  invites: authedQuery.query(({ ctx }) => listInvites(ctx.user.id)),
  acceptInvite: authedQuery.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => acceptInvite(input.id, ctx.user.id)),
});
