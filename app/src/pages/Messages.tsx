import { useState } from "react";
import { Link, useSearchParams, useParams } from "react-router";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/SiteHeader";
import { timeAgo } from "@/lib/blog";

export default function Messages() {
  const { user, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const params = useParams();
  const id = params.id;
  const routeUserId = Number(params.userId);
  const [searchParams] = useSearchParams();
  const targetUserId = routeUserId > 0 ? routeUserId : Number(searchParams.get("userId"));
  const [personSearch, setPersonSearch] = useState("");
  const conversations = trpc.message.conversations.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 10000 });
  const hasTargetUser = targetUserId > 0 && !id;
  const openConversation = trpc.message.open.useQuery({ userId: targetUserId }, { enabled: isAuthenticated && hasTargetUser });
  const targetUser = trpc.auth.byId.useQuery({ id: targetUserId }, { enabled: isAuthenticated && hasTargetUser, retry: false });
  const people = trpc.auth.search.useQuery({ query: personSearch, limit: 12 }, { enabled: isAuthenticated && personSearch.trim().length > 1 });
  const selectedId = id ? Number(id) : openConversation.data?.id;
  const selected = conversations.data?.find((conversation) => conversation.id === selectedId);
  const messages = trpc.message.byId.useQuery({ id: selectedId! }, { enabled: !!selectedId, refetchInterval: 5000 });
  const selectedUser = selected?.user ?? targetUser.data ?? messages.data?.otherUser;
  const utils = trpc.useUtils();
  const send = trpc.message.send.useMutation({ onSuccess: () => { utils.message.byId.invalidate({ id: selectedId! }); utils.message.conversations.invalidate(); setText(""); } });
  const [text, setText] = useState("");

  if (!isAuthenticated) return null;
  return <main className="messages-page"><div className="messages-shell"><header className="messages-heading"><div><p className="font-mono-data groups-kicker">БЛОГСОР // MESSAGES</p><h1>Messages</h1></div><MessageCircle size={26} /></header><div className="messages-layout"><aside className="conversation-list"><h2>Чатууд</h2><label className="message-person-search"><input value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} placeholder="Хүн хайж чатлах..." /></label>{people.data?.map((person) => <Link className="message-person-result" key={person.id} to={`/messages?userId=${person.id}`}><Avatar name={person.name} src={person.avatar} size={30} /><span>{person.name ?? "Хэрэглэгч"}</span></Link>)}{conversations.data?.map((conversation) => <Link className={`conversation-item ${conversation.id === selectedId ? "active" : ""}`} key={conversation.id} to={`/messages/${conversation.id}`}><Avatar name={conversation.user?.name} src={conversation.user?.avatar} size={38} /><span><strong>{conversation.user?.name ?? "Хэрэглэгч"}</strong><small>{conversation.lastMessage?.content ?? "Шинэ conversation"}</small></span></Link>)}{!conversations.data?.length && <p className="messages-muted">Одоогоор чат алга.</p>}</aside><section className="conversation-view">{selectedId && messages.data ? <><header className="conversation-header"><Link to="/messages"><ArrowLeft size={16} /></Link><Avatar name={selectedUser?.name} src={selectedUser?.avatar} size={36} /><strong>{selectedUser?.name ?? "Хэрэглэгч"}</strong></header><div className="message-list">{messages.data.messages.map((message) => <div className={`message-bubble ${message.senderId === user?.id ? "mine" : "theirs"}`} key={message.id}>{message.content}<small>{timeAgo(message.createdAt)}</small></div>)}</div><form className="message-compose" onSubmit={(event) => { event.preventDefault(); if (text.trim() && selectedUser?.id) send.mutate({ recipientId: selectedUser.id, content: text.trim() }); }}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Message бичих..." maxLength={5000} /><button type="submit" disabled={!text.trim() || send.isPending}><Send size={16} /></button></form></> : <div className="messages-empty"><MessageCircle size={32} /><p>Чат сонгох эсвэл profile/post дээрээс CHAT дарна уу.</p></div>}</section></div></div></main>;
}
