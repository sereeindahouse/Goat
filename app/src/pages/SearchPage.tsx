import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, UserRound, FileText } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Avatar } from "@/components/SiteHeader";
import { excerptOf } from "@/lib/blog";
import { POST_CATEGORIES } from "@contracts/covers";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"posts" | "people">("posts");
  const [category, setCategory] = useState<string | null>(null);
  const people = trpc.auth.search.useQuery({ query, limit: 30 }, { enabled: kind === "people" && query.trim().length > 1 });
  const posts = trpc.post.list.useQuery({ limit: 60 }, { enabled: kind === "posts" });
  const matchingPosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return (posts.data ?? []).filter((post) => {
      const searchableText = [post.title, post.excerpt, post.content, post.category, post.author.name].join(" ").toLocaleLowerCase();
      return (!category || post.category === category) && searchableText.includes(normalized);
    });
  }, [posts.data, query, category]);

  return <main className="search-page"><div className="search-shell"><p className="font-mono-data groups-kicker">БЛОГСОР // SEARCH</p><h1>Хайлт</h1><label className="search-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Хүн эсвэл пост хайх..." /></label><div className="search-tabs"><button className={kind === "posts" ? "active" : ""} onClick={() => setKind("posts")}><FileText size={15} /> POST</button><button className={kind === "people" ? "active" : ""} onClick={() => setKind("people")}><UserRound size={15} /> PEOPLE</button></div>{kind === "posts" && <div className="main-feed-categories search-categories"><button className={!category ? "active" : ""} onClick={() => setCategory(null)}>БҮГД</button>{POST_CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>}{kind === "people" ? <div className="search-results">{people.data?.map((person) => <Link className="search-person" key={person.id} to={`/profile/${person.id}`}><Avatar name={person.name} src={person.avatar} size={38} /><span><strong>{person.name ?? "Хэрэглэгч"}</strong><small>{person.email}</small></span></Link>)}</div> : <div className="search-results">{matchingPosts.map((post) => <Link className="search-post" key={post.id} to={`/post/${post.id}`}><span className="font-mono-data">{post.category}</span><h2>{post.title}</h2><p>{excerptOf(post.content, 220)}</p><small>{post.author.name ?? "Хэрэглэгч"}</small></Link>)}</div>}</div></main>;
}
