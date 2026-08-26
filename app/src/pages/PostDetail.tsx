import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/SiteHeader";
import { formatDate, readingTime, timeAgo } from "@/lib/blog";
import type { Comment, User } from "@contracts/types";
import { Pencil, Trash2, MessageSquare, Send, ThumbsUp, Eye, MessageCircle, Bookmark, Sparkles, Check, Copy, Loader2 } from "lucide-react";

type CommentWithAuthor = Comment & { author: User };

function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div style={{ fontSize: "1.08rem", lineHeight: 1.75, color: "rgba(232,230,224,0.85)" }}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="font-geist-mono"
              style={{ fontSize: "1.5rem", fontWeight: 600, margin: "36px 0 16px", color: "#e8e6e0" }}
            >
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} style={{ margin: "0 0 22px 0", paddingLeft: 22 }}>
              {trimmed.split("\n").map((l, j) => (
                <li key={j} style={{ marginBottom: 6 }}>
                  {l.trim().slice(2)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ margin: "0 0 22px 0", whiteSpace: "pre-line" }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const postId = Number(id);
  const validId = Number.isInteger(postId) && postId > 0;

  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const postQuery = trpc.post.byId.useQuery({ id: postId }, { enabled: validId, retry: false });
  const commentsQuery = trpc.comment.listByPost.useQuery({ postId }, { enabled: validId });
  const relatedQuery = trpc.post.related.useQuery(
    { category: postQuery.data?.category ?? "", excludeId: postId },
    { enabled: validId && !!postQuery.data?.category, retry: false },
  );
  const hasEndorsedQuery = trpc.post.hasEndorsed.useQuery(
    { id: postId },
    { enabled: validId && !!user, retry: false },
  );
  const isBookmarkedQuery = trpc.bookmark.isBookmarked.useQuery(
    { postId },
    { enabled: validId && !!user, retry: false },
  );

  const [commentText, setCommentText] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewedKey = useRef<string | null>(null);

  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.comment.listByPost.invalidate({ postId });
      utils.post.list.invalidate();
    },
  });

  const deleteComment = trpc.comment.delete.useMutation({
    onSuccess: () => {
      utils.comment.listByPost.invalidate({ postId });
      utils.post.list.invalidate();
    },
  });

  const deletePost = trpc.post.delete.useMutation({
    onSuccess: () => {
      utils.post.list.invalidate();
      navigate("/");
    },
  });

  const endorsePost = trpc.post.endorse.useMutation({
    onSuccess: (updated) => {
      if (updated) utils.post.byId.setData({ id: postId }, updated);
      utils.post.list.invalidate();
      utils.post.hasEndorsed.invalidate({ id: postId });
    },
  });

  const toggleBookmark = trpc.bookmark.toggle.useMutation({
    onSuccess: (data) => {
      utils.bookmark.isBookmarked.setData({ postId }, data.bookmarked);
      utils.bookmark.list.invalidate();
    },
  });

  const summarizePost = trpc.ai.postSummary.useMutation({
    onSuccess: (result) => setSummary(result),
  });

  const recordViewMutation = trpc.post.view.useMutation({
    onSuccess: (updated) => {
      if (updated) utils.post.byId.setData({ id: postId }, updated);
      utils.post.list.invalidate();
    },
  });

  const post = postQuery.data;
  const comments = useMemo(() => commentsQuery.data ?? [], [commentsQuery.data]);

  const canModifyPost = !!user && !!post && (post.authorId === user.id || user.role === "admin");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!post || !user || recordViewMutation.isPending) return;
    const key = `${post.id}:${user.id}`;
    if (viewedKey.current === key) return;
    viewedKey.current = key;
    recordViewMutation.mutate({ id: post.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, user?.id]);


  if (!validId || (!postQuery.isLoading && !post)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div className="font-geist-mono" style={{ fontSize: "2rem" }}>
          Нийтлэл олдсонгүй
        </div>
        <Link to="/" style={{ color: "rgba(255,255,255,0.7)", letterSpacing: "0.12em" }}>
          ← Нүүр рүү буцах
        </Link>
      </div>
    );
  }

  if (postQuery.isLoading || !post) {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e8e6e0",
        fontFamily: '"Inter", sans-serif',
        padding: "96px clamp(16px, 5vw, 64px) 80px",
        boxSizing: "border-box",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "48px",
          fontFamily: '"Geist Mono", monospace',
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "transparent",
            border: "none",
            color: "#e8e6e0",
            padding: 0,
            fontFamily: "inherit",
            fontSize: "inherit",
            letterSpacing: "inherit",
            opacity: 0.7,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          ← Буцах
        </button>
        <span style={{ opacity: 0.4 }}>№{post.id} · НИЙТЛЭЛ</span>
      </div>

      {/* Cover */}
      {post.coverImage && (
        <div
          style={{
            width: "100%",
            maxWidth: "1100px",
            margin: "0 auto",
            aspectRatio: "3 / 2",
            marginBottom: "48px",
            background: "rgba(255,255,255,0.04)",
            overflow: "hidden",
          }}
        >
          <img
            src={post.coverImage}
            alt={post.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              filter: "contrast(0.95) saturate(0.95)",
            }}
          />
        </div>
      )}

      {/* Article */}
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div
          className="font-geist-mono"
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.5,
            marginBottom: "20px",
          }}
        >
          {[post.category, readingTime(post.content), formatDate(post.createdAt)].join(" · ")}
        </div>

        <h1
          className="font-geist-mono"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.4rem)",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "0 0 24px 0",
          }}
        >
          {post.title}
        </h1>

        {post.excerpt && (
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "rgba(232,230,224,0.6)", margin: "0 0 28px 0" }}>
            {post.excerpt}
          </p>
        )}

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            rowGap: "10px",
            columnGap: "16px",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "0.78rem",
            letterSpacing: "0.06em",
            marginBottom: "40px",
            paddingTop: "20px",
            paddingBottom: "28px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <dt style={{ opacity: 0.5, margin: 0 }}>Зохиогч</dt>
          <dd style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={post.author?.name} src={post.author?.avatar} size={22} />
            {post.author?.name ?? "Хэрэглэгч"}
            {user && post.authorId !== user.id && <Link to={`/messages/user/${post.authorId}`} className="post-chat-link"><MessageCircle size={13} /> CHAT</Link>}
          </dd>
          <dt style={{ opacity: 0.5, margin: 0 }}>Огноо</dt>
          <dd style={{ margin: 0 }}>{formatDate(post.createdAt)}</dd>
          <dt style={{ opacity: 0.5, margin: 0 }}>Ангилал</dt>
          <dd style={{ margin: 0 }}>
            <Link to={`/?category=${encodeURIComponent(post.category)}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {post.category}
            </Link>
          </dd>
        </dl>

        <ArticleBody content={post.content} />

        <section style={{ marginTop: 36, padding: 18, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.04)" }}>
          <button
            type="button"
            onClick={() => summarizePost.mutate({ title: post.title, content: post.content })}
            disabled={summarizePost.isPending}
            className="font-geist-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: summarizePost.isPending ? "rgba(255,255,255,0.12)" : "transparent",
              color: "#e8e6e0",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "10px 15px",
              fontSize: "0.72rem",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            {summarizePost.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {summarizePost.isPending ? "AI УНШИЖ БАЙНА…" : "3 ГОЛ САНААГ УНШИХ"}
          </button>

          {summary && <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "rgba(232,230,224,0.8)", margin: "16px 0 0" }}>{summary}</p>}
          {summarizePost.error && <p style={{ color: "#ff9a9a", fontSize: "0.75rem", margin: "12px 0 0" }}>{summarizePost.error.message}</p>}
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <button type="button" onClick={() => endorsePost.mutate({ id: post.id })} disabled={!user || endorsePost.isPending || hasEndorsedQuery.data === true} className="font-geist-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: hasEndorsedQuery.data ? "rgba(255,255,255,0.12)" : "transparent", color: "#e8e6e0", border: "1px solid rgba(255,255,255,0.3)", padding: "10px 15px", fontSize: "0.72rem", letterSpacing: "0.1em", opacity: !user || hasEndorsedQuery.data ? 0.65 : 1 }}>
            <ThumbsUp size={14} /> {!user ? "НЭВТЭРЭХ ШААРДЛАГАТАЙ" : hasEndorsedQuery.data ? "ДЭМЖСЭН" : "УР ЧАДВАРЫГ ДЭМЖИХ"} · {post.endorsementCount ?? 0}
          </button>
          {user && (
            <button type="button" onClick={() => toggleBookmark.mutate({ postId: post.id })} disabled={toggleBookmark.isPending} className="font-geist-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isBookmarkedQuery.data ? "rgba(255,255,255,0.12)" : "transparent", color: "#e8e6e0", border: "1px solid rgba(255,255,255,0.3)", padding: "10px 15px", fontSize: "0.72rem", letterSpacing: "0.1em", opacity: toggleBookmark.isPending ? 0.65 : 1 }}>
              <Bookmark size={14} fill={isBookmarkedQuery.data ? "currentColor" : "none"} /> {isBookmarkedQuery.data ? "ХАДГАЛСАН" : "ХАДГАЛАХ"}
            </button>
          )}
          <span className="font-mono-data" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", padding: "0 6px" }}><Eye size={14} /> {post.viewCount ?? 0} ҮЗЭЛТ</span>
        </div>

        {/* Social Share */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 16 }}>
          <span className="font-mono-data" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em" }}>ХУВААЛЦАХ:</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="font-geist-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              color: "#e8e6e0",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "6px 12px",
              fontSize: "0.68rem",
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={12} color="#86efac" /> : <Copy size={12} />}
            {copied ? "ХУУЛСАН!" : "ЛИНК ХУУЛАХ"}
          </button>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-geist-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              color: "#e8e6e0",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "6px 12px",
              fontSize: "0.68rem",
              textDecoration: "none",
            }}
          >
            TELEGRAM
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-geist-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              color: "#e8e6e0",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "6px 12px",
              fontSize: "0.68rem",
              textDecoration: "none",
            }}
          >
            FACEBOOK
          </a>
        </div>

        {/* Owner controls */}
        {canModifyPost && (
          <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
            <Link
              to={`/edit/${post.id}`}
              className="font-geist-mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#e8e6e0",
                textDecoration: "none",
                padding: "9px 16px",
                fontSize: "0.7rem",
                letterSpacing: "0.14em",
              }}
            >
              <Pencil size={12} /> ЗАСАХ
            </Link>
            <button
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                deletePost.mutate({ id: post.id });
              }}
              onBlur={() => setConfirmDelete(false)}
              className="font-geist-mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid rgba(255,80,80,0.45)",
                background: confirmDelete ? "rgba(160,30,30,0.35)" : "transparent",
                color: "#ff9a9a",
                padding: "9px 16px",
                fontSize: "0.7rem",
                letterSpacing: "0.14em",
              }}
            >
              <Trash2 size={12} /> {confirmDelete ? "БАТАЛГААЖУУЛАХ?" : "УСТГАХ"}
            </button>
          </div>
        )}


        {/* Comments */}
        <section style={{ marginTop: "72px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <h2
            className="font-geist-mono"
            style={{
              fontSize: "0.85rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              margin: "0 0 28px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <MessageSquare size={15} /> Сэтгэгдэл ({comments.length})
          </h2>

          {isAuthenticated ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                createComment.mutate({ postId: post.id, content: commentText.trim() });
              }}
              style={{ marginBottom: 36 }}
            >
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Сэтгэгдлээ бичнэ үү…"
                rows={3}
                maxLength={2000}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#e8e6e0",
                  padding: "12px 14px",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span className="font-mono-data" style={{ fontSize: "0.62rem", opacity: 0.35, letterSpacing: "0.1em" }}>
                  {commentText.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={createComment.isPending || !commentText.trim()}
                  className="font-geist-mono"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#e8e6e0",
                    color: "#0a0a0a",
                    border: "none",
                    padding: "10px 20px",
                    fontSize: "0.72rem",
                    letterSpacing: "0.16em",
                    opacity: createComment.isPending || !commentText.trim() ? 0.5 : 1,
                  }}
                >
                  <Send size={12} /> {createComment.isPending ? "ИЛГЭЭЖ БАЙНА…" : "ИЛГЭЭХ"}
                </button>
              </div>
              {createComment.error && (
                <div className="font-mono-data" style={{ color: "#ff9a9a", fontSize: "0.68rem", marginTop: 8 }}>
                  {createComment.error.message}
                </div>
              )}
            </form>
          ) : (
            <div
              className="font-mono-data"
              style={{
                border: "1px dashed rgba(255,255,255,0.2)",
                padding: "18px 20px",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.55)",
                marginBottom: 36,
              }}
            >
              Сэтгэгдэл үлдээхийн тулд{" "}
              <Link to="/login" style={{ color: "#fff" }}>
                нэвтэрнэ үү →
              </Link>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {comments.length === 0 && (
              <div className="font-mono-data" style={{ fontSize: "0.7rem", opacity: 0.35, letterSpacing: "0.12em", padding: "12px 0" }}>
                Анхны сэтгэгдлийг та үлдээгээрэй.
              </div>
            )}
            {comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                canDelete={
                  !!user &&
                  (c.authorId === user.id || user.role === "admin" || post.authorId === user.id)
                }
                onDelete={() => deleteComment.mutate({ id: c.id })}
                deleting={deleteComment.isPending && deleteComment.variables?.id === c.id}
              />
            ))}
          </div>
        </section>

        {relatedQuery.data && relatedQuery.data.length > 0 && (
          <section style={{ marginTop: "72px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <h2 className="font-geist-mono" style={{ fontSize: "0.85rem", letterSpacing: "0.2em", margin: "0 0 24px", textTransform: "uppercase" }}>
              ТАНД САНАЛ БОЛГОХ НИЙТЛЭЛҮҮД
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {relatedQuery.data.map((related) => (
                <Link key={related.id} to={`/post/${related.id}`} style={{ color: "#e8e6e0", textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)", overflow: "hidden" }}>
                  {related.coverImage && <img src={related.coverImage} alt="" loading="lazy" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />}
                  <div style={{ padding: 16 }}>
                    <div className="font-mono-data" style={{ fontSize: "0.6rem", opacity: 0.45, marginBottom: 10 }}>{related.category}</div>
                    <div className="font-geist-mono" style={{ fontSize: "0.95rem", lineHeight: 1.35 }}>{related.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div
          style={{
            marginTop: "64px",
            paddingTop: "32px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <Link
            to="/"
            style={{ color: "#e8e6e0", textDecoration: "none", opacity: 0.7 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          >
            ← Бүх нийтлэл
          </Link>
          <span style={{ opacity: 0.3 }}>БЛОГСОР</span>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  canDelete,
  onDelete,
  deleting,
}: {
  comment: CommentWithAuthor;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "18px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Link to={`/profile/${comment.author.id}`} aria-label={`${comment.author.name ?? "Хэрэглэгч"} профайл`}>
        <Avatar name={comment.author?.name} src={comment.author?.avatar} size={34} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/profile/${comment.author.id}`} className="font-geist-mono" style={{ fontSize: "0.8rem", fontWeight: 600, color: "inherit", textDecoration: "none" }}>
            {comment.author?.name ?? "Хэрэглэгч"}
          </Link>
          <span className="font-mono-data" style={{ fontSize: "0.62rem", opacity: 0.4, letterSpacing: "0.08em" }}>
            {timeAgo(comment.createdAt)}
          </span>
          {canDelete && (
            <button
              onClick={() => {
                if (!confirm) {
                  setConfirm(true);
                  return;
                }
                onDelete();
              }}
              className="font-mono-data"
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                color: confirm ? "#ff9a9a" : "rgba(255,255,255,0.3)",
                fontSize: "0.6rem",
                letterSpacing: "0.12em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
              }}
            >
              <Trash2 size={10} /> {deleting ? "…" : confirm ? "БАТАЛГАА?" : "УСТГАХ"}
            </button>
          )}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "0.95rem", lineHeight: 1.65, color: "rgba(232,230,224,0.8)", whiteSpace: "pre-line" }}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}
