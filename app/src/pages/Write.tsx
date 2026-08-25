import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { COVER_PRESETS, POST_CATEGORIES } from "@contracts/covers";
import { PenLine, Sparkles } from "lucide-react";
import { compressImage } from "@/lib/image";

const labelStyle: React.CSSProperties = {
  fontFamily: '"Space Mono", monospace',
  fontSize: "0.62rem",
  letterSpacing: "0.18em",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#e8e6e0",
  padding: "12px 14px",
  fontFamily: '"Inter", sans-serif',
  fontSize: "0.95rem",
  outline: "none",
};

export default function Write() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const isEdit = editId !== null && Number.isInteger(editId) && editId > 0;
  const [searchParams] = useSearchParams();
  const groupIdParam = Number(searchParams.get("groupId"));
  const groupId = Number.isInteger(groupIdParam) && groupIdParam > 0 ? groupIdParam : null;

  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const utils = trpc.useUtils();

  const existing = trpc.post.byId.useQuery({ id: editId! }, { enabled: isEdit, retry: false });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof POST_CATEGORIES)[number]>(POST_CATEGORIES[0]);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(COVER_PRESETS[0]);
  const [prefilled, setPrefilled] = useState(false);
  const [imageError, setImageError] = useState("");
  const [assistNotice, setAssistNotice] = useState("");

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setImageError("");
    try {
      setCoverImage(await compressImage(file));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Зураг боловсруулахад алдаа гарлаа.");
    }
  };

  useEffect(() => {
    if (isEdit && existing.data && !prefilled) {
      setTitle(existing.data.title);
      setCategory(
        POST_CATEGORIES.includes(existing.data.category as (typeof POST_CATEGORIES)[number])
          ? (existing.data.category as (typeof POST_CATEGORIES)[number])
          : "Амьдрал",
      );
      setExcerpt(existing.data.excerpt);
      setContent(existing.data.content);
      setCoverImage(existing.data.coverImage);
      setPrefilled(true);
    }
  }, [isEdit, existing.data, prefilled]);

  const createPost = trpc.post.create.useMutation({
    onSuccess: (post) => {
      utils.post.list.invalidate();
      if (post) navigate(`/post/${post.id}`);
    },
  });

  const updatePost = trpc.post.update.useMutation({
    onSuccess: (post) => {
      utils.post.list.invalidate();
      utils.post.byId.invalidate({ id: editId! });
      if (post) navigate(`/post/${post.id}`);
    },
  });

  const writingAssist = trpc.ai.writingAssist.useMutation({
    onSuccess: (result, variables) => {
      if (variables.action === "title") setTitle(result.split("\n")[0].replace(/^[-*\d.\s]+/, "").trim());
      if (variables.action === "excerpt") setExcerpt(result);
      if (variables.action === "proofread") setContent(result);
      setAssistNotice("AI-ийн санал form-д орлоо. Нийтлэхээсээ өмнө шалгана уу.");
    },
    onError: () => setAssistNotice("AI боловсруулалт амжилтгүй боллоо. Ollama ажиллаж байгаа эсэхийг шалгана уу."),
  });

  const runWritingAssist = (action: "title" | "excerpt" | "proofread") => {
    setAssistNotice("AI агуулгыг боловсруулж байна…");
    writingAssist.mutate({ action, title, content });
  };

  const saving = createPost.isPending || updatePost.isPending;
  const error = createPost.error ?? updatePost.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      category,
      coverImage,
      groupId: isEdit ? existing.data?.groupId ?? null : groupId,
    };
    if (isEdit) {
      updatePost.mutate({ id: editId!, ...payload });
    } else {
      createPost.mutate(payload);
    }
  };

  if (authLoading || (isEdit && existing.isLoading)) {
    return (
      <div
        className="font-mono-data"
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.2em",
          fontSize: "0.75rem",
        }}
      >
        УНШИЖ БАЙНА…
      </div>
    );
  }

  if (!isAuthenticated) return null; // redirecting to /login

  if (isEdit && existing.data && user && existing.data.authorId !== user.id && user.role !== "admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#e8e6e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div className="font-geist-mono" style={{ fontSize: "1.6rem" }}>
          Зөвхөн өөрийн нийтлэлийг засах боломжтой
        </div>
        <Link to="/" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}>
          ← Нүүр рүү буцах
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e8e6e0",
        fontFamily: '"Inter", sans-serif',
        padding: "110px clamp(16px, 5vw, 64px) 80px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          className="font-geist-mono"
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.5,
            marginBottom: 16,
          }}
        >
          {isEdit ? `№${editId} // ЗАСАХ` : "ШИНЭ НИЙТЛЭЛ"}
        </div>
        <h1
          className="font-geist-mono"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 500, margin: "0 0 36px 0", display: "flex", alignItems: "center", gap: 14 }}
        >
          <PenLine size={26} /> {isEdit ? "Нийтлэл засах" : "Юу бичих вэ?"}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Гарчиг *</label>
              <button type="button" onClick={() => runWritingAssist("title")} disabled={writingAssist.isPending || content.trim().length < 10} className="font-mono-data" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", padding: "6px 9px", fontSize: "0.62rem" }}><Sparkles size={12} /> {writingAssist.isPending && writingAssist.variables?.action === "title" ? "AI БОЛОВСРУУЛЖ БАЙНА…" : "AI ГАРЧИГ"}</button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              placeholder="Нийтлэлийн гарчиг (хамгийн багадаа 3 тэмдэгт)"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Товч агуулга</label>
              <button type="button" onClick={() => runWritingAssist("excerpt")} disabled={writingAssist.isPending || content.trim().length < 10} className="font-mono-data" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", padding: "6px 9px", fontSize: "0.62rem" }}><Sparkles size={12} /> {writingAssist.isPending && writingAssist.variables?.action === "excerpt" ? "AI БОЛОВСРУУЛЖ БАЙНА…" : "AI ТОВЧЛОЛ"}</button>
            </div>
            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={500}
              placeholder="Нэг өгүүлбэр танилцуулга (заавал биш)"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Ангилал</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {POST_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="font-geist-mono"
                  style={{
                    background: category === c ? "#e8e6e0" : "transparent",
                    color: category === c ? "#0a0a0a" : "rgba(255,255,255,0.65)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    padding: "7px 14px",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Ковер зураг</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              <label
                className="font-mono-data"
                style={{ aspectRatio: "3 / 2", border: "1px dashed rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: "0.6rem", letterSpacing: "0.1em", cursor: "pointer", padding: 12, boxSizing: "border-box" }}
              >
                КОМПЬЮТЕРЭЭС<br />ЗУРАГ СОНГОХ
                <input type="file" accept="image/*" onChange={(event) => handleImageFile(event.target.files?.[0])} style={{ display: "none" }} />
              </label>
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                className="font-mono-data"
                style={{
                  aspectRatio: "3 / 2",
                  border: coverImage === null ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.12em",
                }}
              >
                ЗУРАГГҮЙ
              </button>
              {COVER_PRESETS.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setCoverImage(src)}
                  style={{
                    aspectRatio: "3 / 2",
                    border: coverImage === src ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                    padding: 0,
                    overflow: "hidden",
                    background: "none",
                    opacity: coverImage === src ? 1 : 0.6,
                    transition: "opacity 0.15s",
                  }}
                >
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
            {coverImage?.startsWith("data:image/") && (
              <img src={coverImage} alt="Сонгосон зураг" style={{ marginTop: 12, width: "100%", maxHeight: 240, objectFit: "cover" }} />
            )}
            {imageError && <p style={{ color: "#ff9a9a", fontSize: "0.7rem", marginTop: 8 }}>{imageError}</p>}
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Агуулга * (хоосон мөрөөр догол мөр тусгаарлана, "## " гарчиг, "- " жагсаалт)</label>
              <button type="button" onClick={() => runWritingAssist("proofread")} disabled={writingAssist.isPending || content.trim().length < 10} className="font-mono-data" style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", padding: "6px 9px", fontSize: "0.62rem" }}><Sparkles size={12} /> {writingAssist.isPending ? "AI БОЛОВСРУУЛЖ БАЙНА…" : "AI ЗАСАХ"}</button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              placeholder={"Энд бичнэ үү…\n\n## Дэд гарчиг\n\n- Жагсаалтын зүйл"}
              style={{ ...inputStyle, lineHeight: 1.7, resize: "vertical" }}
              required
            />
          </div>

          {assistNotice && <div className="font-mono-data" style={{ color: writingAssist.error ? "#ff9a9a" : "rgba(255,255,255,0.62)", fontSize: "0.7rem", marginBottom: 16 }}>{assistNotice}</div>}
          {writingAssist.error && <div className="font-mono-data" style={{ color: "#ff9a9a", fontSize: "0.7rem", marginBottom: 16 }}>{writingAssist.error.message}</div>}

          {error && (
            <div className="font-mono-data" style={{ color: "#ff9a9a", fontSize: "0.7rem", marginBottom: 16, letterSpacing: "0.06em" }}>
              {error.message}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="submit"
              disabled={saving || title.trim().length < 3 || content.trim().length < 10}
              className="font-geist-mono"
              style={{
                background: "#e8e6e0",
                color: "#0a0a0a",
                border: "none",
                padding: "13px 32px",
                fontSize: "0.75rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                opacity: saving || title.trim().length < 3 || content.trim().length < 10 ? 0.45 : 1,
              }}
            >
              {saving ? "ХАДГАЛЖ БАЙНА…" : isEdit ? "ХАДГАЛАХ" : "НИЙТЛЭХ"}
            </button>
            <Link
              to={isEdit ? `/post/${editId}` : "/"}
              className="font-geist-mono"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.72rem", letterSpacing: "0.14em", textDecoration: "none" }}
            >
              БОЛИХ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
