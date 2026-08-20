import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import type { Comment, GuestbookEntry, Post } from "@db/schema";

type OllamaResponse = { message?: { content?: string } };

function trimContext(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength).trimEnd()}…`;
}

async function buildBlogContext() {
  const db = await getDb();
  const [posts, guestbook, comments] = await Promise.all([
    db.collection<Post>("posts")
      .find({}, { projection: { _id: 0, id: 1, title: 1, category: 1, excerpt: 1, content: 1 } })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection<GuestbookEntry>("guestbook")
      .find({}, { projection: { _id: 0, name: 1, message: 1 } })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray(),
    db.collection<Comment>("comments")
      .find({}, { projection: { _id: 0, postId: 1, content: 1 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray(),
  ]);

  const postContext = posts.map((post) => (
    `№${post.id} | ${post.title} | ${post.category}\n${trimContext(post.excerpt || post.content, 900)}`
  )).join("\n\n");
  const guestbookContext = guestbook.map((entry) => (
    `${trimContext(entry.name, 80)}: ${trimContext(entry.message, 300)}`
  )).join("\n");
  const commentContext = comments.map((comment) => (
    `№${comment.postId}: ${trimContext(comment.content, 300)}`
  )).join("\n");

  return [
    `НИЙТЛЭЛҮҮД:\n${postContext || "Одоогоор нийтлэл алга."}`,
    `ЗОЧНЫ ДЭВТЭР:\n${guestbookContext || "Одоогоор бичлэг алга."}`,
    `СЭТГЭГДЛҮҮД:\n${commentContext || "Одоогоор сэтгэгдэл алга."}`,
  ].join("\n\n");
}

export async function answerBlogQuestion(question: string): Promise<string> {
  const context = await buildBlogContext();

  let response: Response;
  try {
    response = await fetch(`${env.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.ollamaModel,
        stream: false,
        options: { temperature: 0.2 },
        messages: [
          {
            role: "system",
            content: `Та бол Блогсор сайтын туслах. Монгол хэлээр товч, тодорхой хариул. Зөвхөн доорх Блогсорын context-д байгаа мэдээлэлд тулгуурла. Мэдэхгүй зүйлээ зохиож болохгүй. Хариултыг мэдэхгүй бол "Энэ талаар Блогсорын мэдээллээс олдсонгүй" гэж хэл. Холбогдох нийтлэл байвал гарчиг болон /post/ID холбоосыг дурд. Guestbook эсвэл comment-ийн хүний нэр, хувийн мэдээллийг илүүчилж дэлгэхгүй.\n\n${context}`,
          },
          { role: "user", content: question },
        ],
      }),
    });
  } catch {
    throw new Error("Ollama ажиллахгүй байна. Ollama-г асаагаад дахин оролдоно уу.");
  }

  if (!response.ok) {
    throw new Error(`Ollama хүсэлтийг хүлээж авсангүй (${response.status}). ${env.ollamaModel} model суусан эсэхийг шалгана уу.`);
  }

  const result = (await response.json()) as OllamaResponse;
  const answer = result.message?.content?.trim();
  if (!answer) throw new Error("AI хоосон хариу буцаалаа. Дахин оролдоно уу.");
  return answer;
}