import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { PenLine, LogOut } from "lucide-react";

export function Avatar({
  name,
  src,
  size = 28,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
}) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid rgba(255,255,255,0.25)",
          display: "block",
        }}
      />
    );
  }
  return (
    <span
      className="font-geist-mono"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c4a96",
        color: "#fff",
        fontSize: size * 0.45,
        border: "1px solid rgba(255,255,255,0.25)",
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

export default function SiteHeader() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header
      className="liquid-glass-strong"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "clamp(12px, 2vw, 28px)",
        padding: "10px 22px",
        borderRadius: 4,
        maxWidth: "min(94vw, 1100px)",
        whiteSpace: "nowrap",
      }}
    >
      <Link
        to="/"
        className="font-geist-mono"
        style={{
          color: "#fff",
          textDecoration: "none",
          fontWeight: 700,
          letterSpacing: "0.22em",
          fontSize: "0.85rem",
        }}
      >
        БЛОГСОР
      </Link>

      <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)" }} />

      <Link
        to="/write"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "rgba(255,255,255,0.85)",
          textDecoration: "none",
          fontSize: "0.72rem",
          letterSpacing: "0.14em",
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        <PenLine size={13} /> БИЧИХ
      </Link>

      {!isLoading &&
        (isAuthenticated && user ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Link to={`/profile/${user.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "inherit", textDecoration: "none" }}>
              <Avatar name={user.name} src={user.avatar} size={24} />
                          </Link>
              <span
                className="font-mono-data"
                style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {user.name ?? "Хэрэглэгч"}
              </span>
            </span>
            <button
              onClick={() => logout()}
              title="Гарах"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.7)",
                borderRadius: 3,
                padding: "4px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                fontFamily: '"Space Mono", monospace',
              }}
            >
              <LogOut size={11} /> ГАРАХ
            </button>
          </span>
        ) : (
          <Link
            to="/login"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              fontFamily: '"Geist Mono", monospace',
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 3,
              padding: "5px 12px",
            }}
          >
            НЭВТРЭХ
          </Link>
        ))}
    </header>
  );
}
