import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, Save, MessageCircle } from "lucide-react";
import { compressImage } from "@/lib/image";

export default function Profile() {
  const { id } = useParams();
  const profileId = Number(id);
  const validId = Number.isInteger(profileId) && profileId > 0;
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const profileQuery = trpc.auth.byId.useQuery(
    { id: profileId },
    { enabled: validId, retry: false },
  );
  const postsQuery = trpc.post.byAuthor.useQuery(
    { authorId: profileId },
    { enabled: validId, retry: false },
  );
  const savedPostsQuery = trpc.bookmark.list.useQuery(undefined, {
    enabled: validId && !!user && user.id === profileId,
    retry: false,
  });
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [editing, setEditing] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name ?? "");
      setAvatar(profileQuery.data.avatar ?? "");
    }
  }, [profileQuery.data]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async (updated) => {
      if (!updated) return;
      utils.auth.byId.setData({ id: profileId }, updated);
      utils.auth.me.setData(undefined, updated);
      await utils.auth.byId.invalidate({ id: profileId });
      setEditing(false);
    },
  });

  const profile = profileQuery.data;
  const isOwner = !!user && !!profile && user.id === profile.id;

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImageError("");
      setAvatar(await compressImage(file, 800));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Зураг боловсруулахад алдаа гарлаа.");
    }
  };

  if (!validId || (!profileQuery.isLoading && !profile)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="font-geist-mono text-2xl mb-4">Профайл олдсонгүй</h1>
          <Link to="/" className="opacity-70 hover:opacity-100">← Нүүр рүү буцах</Link>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-black text-white px-6 py-32">
      <div className="mx-auto max-w-4xl">
        <div className="border-b border-white/15 pb-10">
          <div className="flex flex-wrap items-start gap-6">
            <Avatar name={profile.name} src={profile.avatar} size={96} />
            <div className="min-w-0 flex-1">
              <p className="font-mono-data text-xs tracking-[0.18em] text-white/40 mb-3">БЛОГСОР / ПРОФАЙЛ</p>
              <h1 className="font-geist-mono text-3xl md:text-5xl break-words">{profile.name ?? "Хэрэглэгч"}</h1>
              <p className="font-mono-data text-xs text-white/45 mt-4">{postsQuery.data?.length ?? 0} нийтлэл</p>
            </div>
            {isOwner && (
              <Button type="button" aria-label={editing ? "Профайлын засварыг болих" : "Профайл засах"} className="min-h-11 border border-white/70 bg-white px-4 font-geist-mono text-sm font-semibold text-black hover:bg-white/85" onClick={() => setEditing((value) => !value)}>
                <PenLine size={15} /> {editing ? "БОЛИХ" : "ПРОФАЙЛ ЗАСАХ"}
              </Button>
            )}
            {!isOwner && user && <Link to={`/messages/user/${profile.id}`} className="profile-chat-link"><MessageCircle size={15} /> CHAT</Link>}
          </div>

          {editing && (
            <form
              className="mt-8 grid max-w-xl gap-4 border-t border-white/10 pt-6"
              onSubmit={(event) => {
                event.preventDefault();
                updateProfile.mutate({ name: name.trim(), avatar: avatar.trim() || null });
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Хоч / нэр</Label>
                <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-avatar">Профайлын зургийн URL</Label>
                <Input id="profile-avatar" type="text" value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://.../image.jpg" />
                <label className="flex min-h-11 cursor-pointer items-center justify-center border border-dashed border-white/35 px-4 text-center font-mono-data text-xs text-white/65 hover:border-white">
                  КОМПЬЮТЕРЭЭС ЗУРАГ СОНГОХ
                  <input type="file" accept="image/*" onChange={(event) => handleImageFile(event.target.files?.[0])} className="hidden" />
                </label>
                <p className="font-mono-data text-[0.65rem] text-white/40">Зураг багасгагдаж users.avatar талбарт хадгалагдана.</p>
                {imageError && <p className="text-sm text-red-400">{imageError}</p>}
              </div>
              {updateProfile.error && <p className="text-sm text-red-400">{updateProfile.error.message}</p>}
              <Button type="submit" disabled={updateProfile.isPending} className="w-fit">
                <Save size={15} /> {updateProfile.isPending ? "Хадгалж байна…" : "Хадгалах"}
              </Button>
            </form>
          )}
        </div>

        <section className="pt-10">
          <h2 className="font-geist-mono text-xl mb-6">Нийтлэлүүд</h2>
          {postsQuery.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {postsQuery.data.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`} className="border border-white/15 p-5 text-white no-underline hover:border-white/50">
                  <p className="font-mono-data text-[0.65rem] text-white/40 mb-3">{post.category}</p>
                  <h3 className="font-geist-mono text-lg">{post.title}</h3>
                  <p className="mt-3 text-sm text-white/55 line-clamp-3">{post.excerpt || post.content}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="font-mono-data text-xs text-white/40">Одоогоор нийтлэл алга.</p>
          )}
        </section>

        {isOwner && (
          <section className="border-t border-white/15 pt-10 mt-10">
            <h2 className="font-geist-mono text-xl mb-6">Хадгалсан нийтлэлүүд</h2>
            {savedPostsQuery.data?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {savedPostsQuery.data.map((post) => (
                  <Link key={post.id} to={`/post/${post.id}`} className="border border-white/15 p-5 text-white no-underline hover:border-white/50">
                    <p className="font-mono-data text-[0.65rem] text-white/40 mb-3">{post.category}</p>
                    <h3 className="font-geist-mono text-lg">{post.title}</h3>
                    <p className="mt-3 text-sm text-white/55 line-clamp-3">{post.excerpt || post.content}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="font-mono-data text-xs text-white/40">Хадгалсан нийтлэл алга.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
