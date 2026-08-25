import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, PenLine, LogOut, Newspaper, Users, Search, Bell, MessageCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";

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
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = trpc.notification.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 15000 });
  const markRead = trpc.notification.read.useMutation({ onSuccess: () => notifications.refetch() });
  const markAllRead = trpc.notification.readAll.useMutation({ onSuccess: () => notifications.refetch() });
  const unreadCount = notifications.data?.filter((notification) => !notification.readAt).length ?? 0;

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
        background: "rgba(255, 255, 255, 0.94)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.16)",
        overflow: "visible",
      }}
    >
      <Link
        to="/"
        className="font-geist-mono"
        style={{
          color: "#111",
          textDecoration: "none",
          fontWeight: 700,
          letterSpacing: "0.22em",
          fontSize: "0.85rem",
        }}
      >
        БЛОГСОР
      </Link>

      <span style={{ width: 1, height: 18, background: "rgba(17,17,17,0.2)" }} />

      <Link
        to="/main"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#333",
          textDecoration: "none",
          fontSize: "0.72rem",
          letterSpacing: "0.14em",
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        <Newspaper size={13} /> MAIN PAGE
      </Link>

      <Link
        to="/guestbook"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#333",
          textDecoration: "none",
          fontSize: "0.72rem",
          letterSpacing: "0.14em",
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        <BookOpen size={13} /> ЗОЧНЫ ДЭВТЭР
      </Link>

      <Link to="/groups" className="site-header-link"><Users size={13} /> GROUPS</Link>
      <Link to="/search" className="site-header-link" aria-label="Хайх"><Search size={15} /></Link>
      {isAuthenticated && <Link to="/messages" className="site-header-link"><MessageCircle size={15} /> MESSAGES</Link>}
      {isAuthenticated && <span className="notification-wrap"><button className="notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={16} />{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}</button>{notificationsOpen && <div className="notification-panel"><div className="notification-panel-header"><strong>Мэдэгдэл</strong><button onClick={() => markAllRead.mutate()}>БҮГДИЙГ УНШСАН</button></div>{notifications.data?.length ? notifications.data.map((notification) => <button className={`notification-item ${notification.readAt ? "read" : "unread"}`} key={notification.id} onClick={() => { if (!notification.readAt) markRead.mutate({ id: notification.id }); if (notification.link) { setNotificationsOpen(false); navigate(notification.link); } }}><strong>{notification.title}</strong><span>{notification.message}</span><small>{new Date(notification.createdAt).toLocaleString("mn-MN")}</small></button>) : <p className="notification-empty">Мэдэгдэл алга.</p>}</div>}</span>}

      <Link
        to="/write"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#333",
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
                style={{ fontSize: "0.68rem", color: "#333", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {user.name ?? "Хэрэглэгч"}
              </span>
            </span>
            <button
              onClick={() => logout()}
              title="Гарах"
              style={{
                background: "transparent",
                border: "1px solid rgba(17,17,17,0.25)",
                color: "#333",
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
              color: "#111",
              textDecoration: "none",
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              fontFamily: '"Geist Mono", monospace',
              border: "1px solid rgba(17,17,17,0.3)",
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
