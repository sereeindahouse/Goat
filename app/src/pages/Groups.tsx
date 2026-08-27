import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Globe2, LockKeyhole, Plus, UserPlus, UserMinus, ArrowLeft } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/SiteHeader";
import { excerptOf, timeAgo } from "@/lib/blog";
import { compressImage } from "@/lib/image";

export default function Groups() {
  const { id } = useParams();
  if (!id) return <GroupDirectory />;
  const groupId = Number(id);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return <main className="groups-page"><div className="groups-state">Group-ийн дугаар буруу байна.</div></main>;
  }
  return <GroupDetail id={groupId} />;
}

function GroupDirectory() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const groups = trpc.group.list.useQuery();
  const invites = trpc.group.invites.useQuery(undefined, { enabled: isAuthenticated });
  const acceptInvite = trpc.group.acceptInvite.useMutation({ onSuccess: () => invites.refetch() });
  const create = trpc.group.create.useMutation({ onSuccess: (group) => group && navigate(`/groups/${group.id}`) });
  const [form, setForm] = useState({ name: "", description: "", privacy: "public" as "public" | "private", coverImage: null as string | null });

  return (
    <main className="groups-page">
      <div className="groups-shell">
        <header className="groups-heading">
          <div><p className="font-mono-data groups-kicker">БЛОГСОР // GROUPS</p><h1>Нийгэмлэгүүд</h1><p>Сонирхлоороо хүмүүсийг нэг дор цуглуул.</p></div>
          {isAuthenticated && <a className="groups-create-link" href="#create"><Plus size={16} /> GROUP ҮҮСГЭХ</a>}
        </header>
        <div className="groups-grid">
          {groups.data?.map((group) => <Link className="group-tile" key={group.id} to={`/groups/${group.id}`}>{group.coverImage && <img src={group.coverImage} alt="" className="group-tile-image" />}<div className="group-tile-top"><span>{group.privacy === "private" ? <LockKeyhole size={15} /> : <Globe2 size={15} />}</span><span className="font-mono-data">{group.memberCount} гишүүн</span></div><h2>{group.name}</h2><p>{group.description || "Тайлбар оруулаагүй."}</p><small className="font-mono-data">үүсгэсэн: {group.owner.name ?? "Хэрэглэгч"}</small></Link>)}
        </div>
        {groups.isLoading && <div className="groups-state">Group-үүдийг уншиж байна...</div>}
        {groups.error && <div className="groups-state">Өгөгдлийн сангаас group уншиж чадсангүй.</div>}
        {invites.data && invites.data.length > 0 && <section className="group-invites"><h2>Таны урилгууд</h2>{invites.data.map((invite) => <div className="group-invite" key={invite.id}><span>Group #{invite.groupId}-д урьсан байна.</span><button onClick={() => acceptInvite.mutate({ id: invite.id })}>ЗӨВШӨӨРӨХ</button></div>)}</section>}
        {isAuthenticated && <form id="create" className="group-create-form" onSubmit={(event) => { event.preventDefault(); create.mutate(form); }}><h2>Шинэ group үүсгэх</h2><input required minLength={2} maxLength={100} placeholder="Group-ийн нэр" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><textarea maxLength={1000} placeholder="Тайлбар" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><select value={form.privacy} onChange={(event) => setForm({ ...form, privacy: event.target.value as "public" | "private" })}><option value="public">Public - хүн бүр харна</option><option value="private">Private - зөвхөн гишүүд харна</option></select><label className="group-image-input">GROUP ЗУРАГ СОНГОХ<input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setForm({ ...form, coverImage: await compressImage(file, 1200) }); }} /></label>{form.coverImage && <img src={form.coverImage} alt="Group preview" className="group-image-preview" />}<button type="submit" disabled={create.isPending}>ҮҮСГЭХ</button>{create.error && <p>{create.error.message}</p>}</form>}
      </div>
    </main>
  );
}

function GroupDetail({ id }: { id: number }) {
  useAuth();
  const group = trpc.group.byId.useQuery({ id }, { retry: false });
  const posts = trpc.post.groupList.useQuery({ groupId: id }, { retry: false, enabled: Boolean(group.data) });
  const utils = trpc.useUtils();
  const join = trpc.group.join.useMutation({ onSuccess: () => { utils.group.byId.invalidate({ id }); utils.post.groupList.invalidate({ groupId: id }); } });
  const [joinRequested, setJoinRequested] = useState(false);
  const approveJoin = trpc.group.approveJoin.useMutation({ onSuccess: () => utils.group.byId.invalidate({ id }) });
  const remove = trpc.group.removeMember.useMutation({ onSuccess: () => utils.group.byId.invalidate({ id }) });
  const add = trpc.group.addMember.useMutation({ onSuccess: () => utils.group.byId.invalidate({ id }) });
  const invite = trpc.group.invite.useMutation();
  const [personQuery, setPersonQuery] = useState("");
  const people = trpc.auth.search.useQuery({ query: personQuery, limit: 8 }, { enabled: personQuery.trim().length > 1 });
  const detail = group.data;
  const manager = detail?.role === "owner" || detail?.role === "admin";

  if (group.isLoading) return <main className="groups-page"><div className="groups-state">GROUP-ийг уншиж байна...</div></main>;
  if (group.error || !detail) return <main className="groups-page"><div className="groups-state">Private group эсвэл group олдсонгүй.</div></main>;
  const groupError = group.error;
  if (groupError || !detail) return <main className="groups-page"><div className="groups-state">{groupError ? "Group-ийн мэдээллийг уншиж чадсангүй." : "Private group эсвэл group олдсонгүй."}</div></main>;

  return <main className="groups-page"><div className="groups-shell"><Link className="groups-back" to="/groups"><ArrowLeft size={15} /> GROUPS</Link><header className="group-detail-heading">{detail.coverImage && <img src={detail.coverImage} alt="" className="group-detail-image" />}<div><p className="font-mono-data groups-kicker">{detail.privacy === "private" ? "PRIVATE GROUP" : "PUBLIC GROUP"}</p><h1>{detail.name}</h1><p>{detail.description}</p></div>{detail.role ? <Link className="groups-create-link" to={`/write?groupId=${id}`}>GROUP-Д БИЧИХ</Link> : <button className="groups-create-link" disabled={joinRequested || join.isPending} onClick={() => join.mutate({ groupId: id }, { onSuccess: (result) => { if ("requested" in result && result.requested) setJoinRequested(true); } })}>{joinRequested ? "REQUEST SENT" : join.isPending ? "ИЛГЭЭЖ БАЙНА..." : "JOIN GROUP"}</button>}</header><div className="group-detail-layout"><section>{manager && detail.joinRequests.length > 0 && <div className="group-requests"><h2>Join requests · {detail.joinRequests.length}</h2>{detail.joinRequests.map((request) => <div className="group-request" key={request.id}><Avatar name={request.user.name} src={request.user.avatar} size={30} /><span>{request.user.name ?? "Хэрэглэгч"}</span><button onClick={() => approveJoin.mutate({ groupId: id, requestId: request.id, approved: true })}>ЗӨВШӨӨРӨХ</button><button onClick={() => approveJoin.mutate({ groupId: id, requestId: request.id, approved: false })}>ТАТГАЛЗАХ</button></div>)}</div>}<div className="group-posts">{posts.data?.map((post) => <article className="group-post" key={post.id}><div className="group-post-author"><Avatar name={post.author.name} src={post.author.avatar} size={34} /><span><strong>{post.author.name ?? "Хэрэглэгч"}</strong><small className="font-mono-data">{timeAgo(post.createdAt)}</small></span></div><Link to={`/post/${post.id}`}><h2>{post.title}</h2><p>{excerptOf(post.excerpt || post.content, 300)}</p>{post.coverImage && <img src={post.coverImage} alt={post.title} />}</Link></article>)}</div></section><aside className="group-members"><h2>Гишүүд · {detail.members.length}</h2>{manager && <><input placeholder="Хүн хайж нэмэх..." value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} />{people.data?.map((person) => <div className="group-member-action" key={person.id}><span>{person.name ?? person.email}</span><button onClick={() => add.mutate({ groupId: id, userId: person.id })}><UserPlus size={14} /> НЭМЭХ</button><button onClick={() => invite.mutate({ groupId: id, userId: person.id })}>INVITE</button></div>)}</>}{detail.members.map((member) => <div className="group-member" key={member.userId}><Avatar name={member.user.name} src={member.user.avatar} size={30} /><span>{member.user.name ?? "Хэрэглэгч"}<small className="font-mono-data">{member.role}</small></span>{manager && member.role !== "owner" && <button title="Гишүүн хасах" onClick={() => remove.mutate({ groupId: id, userId: member.userId })}><UserMinus size={14} /></button>}</div>)}</aside></div></div></main>;
}
