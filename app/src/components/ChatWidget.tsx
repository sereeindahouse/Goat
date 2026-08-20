import { useState } from "react";
import type { FormEvent } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { trpc } from "@/providers/trpc";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Сайн байна уу. Блогсорын нийтлэлүүдийн талаар асуугаарай." },
  ]);
  const chat = trpc.ai.chat.useMutation({
    onSuccess: (answer) => setMessages((current) => [...current, { role: "assistant", content: answer }]),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || chat.isPending) return;
    setMessages((current) => [...current, { role: "user", content: text }]);
    setMessage("");
    chat.mutate({ message: text });
  }

  return (
    <>
      {open && (
        <section aria-label="Блогсор AI туслах" style={{ position: "fixed", right: 20, bottom: 84, zIndex: 60, width: "min(380px, calc(100vw - 32px))", height: "min(560px, calc(100vh - 120px))", display: "flex", flexDirection: "column", background: "#101010", color: "#e8e6e0", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="font-geist-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.78rem", letterSpacing: "0.12em" }}><Bot size={16} /> БЛОГСОР AI</span>
            <button type="button" aria-label="Chat хаах" onClick={() => setOpen(false)} style={iconButtonStyle}><X size={16} /></button>
          </header>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} style={{ alignSelf: item.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: "10px 12px", lineHeight: 1.55, fontSize: "0.82rem", color: item.role === "user" ? "#0a0a0a" : "rgba(232,230,224,0.82)", background: item.role === "user" ? "#e8e6e0" : "rgba(255,255,255,0.08)" }}>{item.content}</div>
            ))}
            {chat.isPending && <div className="font-mono-data" style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.65rem", letterSpacing: "0.08em" }}>БОДОЖ БАЙНА…</div>}
            {chat.error && <div style={{ color: "#fca5a5", fontSize: "0.75rem", lineHeight: 1.5 }}>{chat.error.message}</div>}
          </div>
          <form onSubmit={submit} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Асуултаа бичнэ үү…" aria-label="AI-д асуулт бичих" style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", padding: "10px 11px", outline: "none" }} />
            <button type="submit" disabled={!message.trim() || chat.isPending} aria-label="Асуулт илгээх" style={{ ...iconButtonStyle, background: "#e8e6e0", color: "#0a0a0a", opacity: !message.trim() || chat.isPending ? 0.45 : 1 }}><Send size={15} /></button>
          </form>
        </section>
      )}
      <button type="button" aria-label={open ? "Chat хаах" : "AI туслах нээх"} onClick={() => setOpen((value) => !value)} style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60, width: 48, height: 48, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.35)", background: open ? "#e8e6e0" : "#101010", color: open ? "#0a0a0a" : "#fff", cursor: "pointer" }}>{open ? <X size={19} /> : <MessageCircle size={19} />}</button>
    </>
  );
}

const iconButtonStyle = { width: 34, height: 34, display: "grid", placeItems: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,0.22)", background: "transparent", color: "#fff", cursor: "pointer" };