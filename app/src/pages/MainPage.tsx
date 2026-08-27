import { useMemo, useState } from "react";
import { Link } from "react-router";
import { MessageSquare, ThumbsUp, Eye, ArrowUpRight, Search, UserRound, FileText } from "lucide-react";
import { trpc } from "@/providers/trpc";
import type { Post } from "@contracts/types";
import { excerptOf, timeAgo } from "@/lib/blog";
import { Avatar } from "@/components/SiteHeader";
import { POST_CATEGORIES } from "@contracts/covers";

type FeedPost = Post & {
  author: { name?: string | null; avatar?: string | null };
  commentCount: number;
  endorsementCount: number;
  viewCount: number;
  highlightComment: { content: string; author: { name?: string | null; avatar?: string | null } } | null;
  group: { id: number; name: string; privacy: "public" | "private" } | null;
};

export default function MainPage() {
  const { data: posts, isLoading, error } = trpc.post.list.useQuery(
    { limit: 60 },
    { retry: false },
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [searchKind, setSearchKind] = useState<"posts" | "people">("posts");
  const people = trpc.auth.search.useQuery(
    { query: search, limit: 30 },
    { enabled: searchKind === "people" && search.trim().length > 1 },
  );
  const visiblePosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (posts ?? []).filter((post) => {
      const searchableText = [post.title, post.excerpt, post.content, post.category, post.author?.name].join(" ").toLocaleLowerCase();
      return (!category || post.category === category) && (!query || searchableText.includes(query));
    });
  }, [posts, search, category]);

  return (
    <main className="main-feed-page">
      <div className="main-feed-shell">
        <header className="main-feed-heading">
          <div>
            <p className="font-mono-data main-feed-kicker">БЛОГСОР // MAIN PAGE</p>
            <h1>Бүх нийтлэл</h1>
            <p className="main-feed-description">Блогсорын шинэ нийтлэлүүдийг  уншаарай.</p>
          </div>
          <Link className="main-feed-write" to="/write">
            <ArrowUpRight size={16} /> НИЙТЛЭЛ БИЧИХ
          </Link>
        </header>

        <div className="main-feed-tools">
          <label className="main-feed-search">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchKind === "people" ? "Хүн хайх..." : "Бүх нийтлэлээс хайх..."} />
          </label>
          <div className="search-tabs main-feed-search-tabs">
            <button className={searchKind === "posts" ? "active" : ""} onClick={() => setSearchKind("posts")}><FileText size={15} /> POST</button>
            <button className={searchKind === "people" ? "active" : ""} onClick={() => setSearchKind("people")}><UserRound size={15} /> PEOPLE</button>
          </div>
          {searchKind === "posts" && <div className="main-feed-categories">
            <button className={!category ? "active" : ""} onClick={() => setCategory(null)}>БҮГД</button>
            {POST_CATEGORIES.map((item) => (
              <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          }
        </div>

        {isLoading && <div className="main-feed-state font-mono-data">Нийтлэлүүдийг уншиж байна...</div>}
        {error && <div className="main-feed-state font-mono-data">Нийтлэлүүдийг ачаалж чадсангүй.</div>}
        {searchKind === "posts" && !isLoading && !error && visiblePosts.length === 0 && (
          <div className="main-feed-state font-mono-data">Хайлтад тохирох нийтлэл олдсонгүй.</div>
        )}

        {searchKind === "posts" ? (
          <div className="main-feed-list">
            {visiblePosts.map((post) => <FeedPostCard key={post.id} post={post as FeedPost} />)}
          </div>
        ) : (
          <div className="search-results main-page-people-results">
            {people.data?.map((person) => (
              <Link className="search-person" key={person.id} to={`/profile/${person.id}`}>
                <Avatar name={person.name} src={person.avatar} size={38} />
                <span><strong>{person.name ?? "Хэрэглэгч"}</strong><small>{person.email}</small></span>
              </Link>
            ))}
            {search.trim().length > 1 && !people.isLoading && people.data?.length === 0 && (
              <div className="main-feed-state font-mono-data">Хэрэглэгч олдсонгүй.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function FeedPostCard({ post }: { post: FeedPost }) {
  return (
    <article className="main-feed-card">
      <div className="main-feed-card-header">
        <Avatar name={post.author?.name} src={post.author?.avatar} size={42} />
        <div>
          <div className="main-feed-author">{post.author?.name ?? "Хэрэглэгч"}</div>
          <div className="font-mono-data main-feed-meta">{timeAgo(post.createdAt)} · {post.category}{post.group && ` · ${post.group.name}`}</div>
        </div>
      </div>

      <Link className="main-feed-card-link" to={`/post/${post.id}`}>
        <h2>{post.title}</h2>
        <p>{excerptOf(post.excerpt || post.content, 260)}</p>
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} loading="lazy" />
        )}
      </Link>

      <div className="font-mono-data main-feed-stats">
        <span><ThumbsUp size={14} /> {post.endorsementCount}</span>
        <span><MessageSquare size={14} /> {post.commentCount}</span>
        <span><Eye size={14} /> {post.viewCount}</span>
      </div>
      {post.highlightComment && (
        <div className="main-feed-highlight-comment">
          <Avatar name={post.highlightComment.author.name} src={post.highlightComment.author.avatar} size={28} />
          <div>
            <strong>{post.highlightComment.author.name ?? "Хэрэглэгч"}</strong>
            <p>{excerptOf(post.highlightComment.content, 180)}</p>
          </div>
        </div>
      )}
    </article>
  );
}