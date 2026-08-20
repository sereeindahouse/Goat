import { useState } from "react";
import type { FormEvent } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/blog";
import { Trash2 } from "lucide-react";

export default function Guestbook() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const entriesQuery = trpc.guestbook.list.useQuery();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const createEntry = trpc.guestbook.create.useMutation({
    onSuccess: () => {
      setName("");
      setMessage("");
      utils.guestbook.list.invalidate();
    },
  });
  const deleteEntry = trpc.guestbook.delete.useMutation({
    onSuccess: () => utils.guestbook.list.invalidate(),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createEntry.mutate({ name, message });
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e6e0", padding: "132px clamp(20px, 6vw, 96px) 80px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="font-mono-data" style={{ fontSize: "0.68rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>ЗОЧДЫН МӨР · 001</div>
        <h1 className="font-geist-mono" style={{ fontSize: "clamp(2.4rem, 7vw, 6rem)", lineHeight: 0.95, fontWeight: 500, margin: "0 0 24px", maxWidth: 700 }}>Энд өөрийн мөрөө үлдээгээрэй.</h1>
        <p style={{ color: "rgba(232,230,224,0.58)", maxWidth: 520, lineHeight: 1.7, marginBottom: 64 }}>Сэтгэгдэл, мэндчилгээ, эсвэл энэ орон зайд төрсөн бодлоо хуваалцаарай. Таны үг энд үлдэнэ.</p>

        <form className="guestbook-form" onSubmit={submit} style={{ borderTop: "1px solid rgba(255,255,255,0.18)", borderBottom: "1px solid rgba(255,255,255,0.18)", padding: "28px 0", display: "grid", gridTemplateColumns: "minmax(180px, 0.4fr) 1fr auto", gap: 16, alignItems: "end", marginBottom: 64 }}>
          <label className="font-mono-data" style={{ display: "grid", gap: 8, fontSize: "0.68rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)" }}>
            НЭР
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Таны нэр" style={inputStyle} />
          </label>
          <label className="font-mono-data" style={{ display: "grid", gap: 8, fontSize: "0.68rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.6)" }}>
            МЕССЕЖ
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} required rows={1} placeholder="Сайн байна уу…" style={{ ...inputStyle, resize: "vertical", minHeight: 42 }} />
          </label>
          <button type="submit" disabled={createEntry.isPending} className="font-mono-data" style={buttonStyle}>{createEntry.isPending ? "ИЛГЭЭЖ БАЙНА" : "ҮЛДЭЭХ →"}</button>
        </form>
        {createEntry.error && <p style={{ color: "#fca5a5", marginTop: -48, marginBottom: 48 }}>{createEntry.error.message}</p>}

        <div style={{ display: "grid", gap: 0 }}>
          {entriesQuery.isLoading && <p className="font-mono-data" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em" }}>УНШИЖ БАЙНА…</p>}
          {!entriesQuery.isLoading && entriesQuery.data?.length === 0 && <p style={{ color: "rgba(255,255,255,0.4)" }}>Одоохондоо энд хэн ч мөр үлдээгээгүй байна.</p>}
          {entriesQuery.data?.map((entry) => {
            const canDelete = !!user && (entry.authorId === user.id || user.role === "admin");
            return <article key={entry.id} className="guestbook-entry" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "24px 0", display: "grid", gridTemplateColumns: "minmax(120px, 0.3fr) 1fr auto", gap: 24 }}>
              <div><div className="font-geist-mono" style={{ fontSize: "1rem", color: "#fff" }}>{entry.name}</div><time className="font-mono-data" style={{ display: "block", marginTop: 8, color: "rgba(255,255,255,0.38)", fontSize: "0.62rem" }}>{formatDate(entry.createdAt)}</time></div>
              <p style={{ margin: 0, lineHeight: 1.7, color: "rgba(232,230,224,0.78)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.message}</p>
              {canDelete && <button type="button" title="Устгах" onClick={() => deleteEntry.mutate({ id: entry.id })} disabled={deleteEntry.isPending} style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.4)", alignSelf: "start", padding: 4 }}><Trash2 size={15} /></button>}
            </article>;
          })}
        </div>
      </div>
    </main>
  );
}

const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", color: "#fff", borderRadius: 0, padding: "11px 12px", font: "inherit", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" as const, width: "100%" };
const buttonStyle = { background: "#e8e6e0", color: "#0a0a0a", border: "1px solid #e8e6e0", padding: "12px 16px", minHeight: 42, cursor: "pointer", whiteSpace: "nowrap" as const, fontSize: "0.68rem", letterSpacing: "0.1em" };