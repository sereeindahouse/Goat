import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { deleteUserById, findUserByEmail, findUserById, listSafeUsers } from "./queries/users";
import type { Comment, GuestbookEntry, Post, User } from "@db/schema";

type OllamaResponse = { message?: { content?: string } };
type AiUser = Pick<User, "id" | "role" | "name">;

const blockedRequests = [
  /бүх\s+(user|хэрэглэгч).*устга/i,
  /устга.*бүх\s+(user|хэрэглэгч)/i,
  /delete\s+all\s+users?/i,
  /намайг\s+admin\s+болго/i,
  /make\s+me\s+admin/i,
];

const userListRequest = /(user|хэрэглэгч).*(жагсаалт|мэдээлэл|харах|харуул)|((show|list).*(users?|user information))/i;
const userDeleteRequest = /(устга|delete).*(user|хэрэглэгч)/i;

function isBlockedRequest(question: string) {
  return blockedRequests.some((pattern) => pattern.test(question));
}

async function handleAdminUserRequest(question: string, user: AiUser) {
  if (!userListRequest.test(question) && !userDeleteRequest.test(question)) return null;
  if (user.role !== "admin") {
    return "Уучлаарай, user-ийн мэдээлэл харах болон устгах эрх зөвхөн admin хэрэглэгчид байна.";
  }

  if (userListRequest.test(question) && !userDeleteRequest.test(question)) {
    const users = await listSafeUsers();
    if (users.length === 0) return "Бүртгэлтэй user алга.";
    return users.map((item) => (
      `ID: ${item.id} | Нэр: ${item.name || "-"} | Email: ${item.email || "-"} | Role: ${item.role}`
    )).join("\n");
  }

  const targetId = question.match(/(?:user|хэрэглэгч)(?:\s+id)?\s*[:#]?\s*(\d+)/i)?.[1];
  const targetEmail = question.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!targetId && !targetEmail) {
    return "Устгах user-ийн ID эсвэл email-ийг тодорхой бичнэ үү. Жишээ: `устга user 12`.";
  }

  const targetUser = targetId
    ? await findUserById(Number(targetId))
    : await findUserByEmail(targetEmail!);
  if (!targetUser) return "Тэр user олдсонгүй.";

  const result = await deleteUserById(user.id, targetUser.id);
  if (result === "self") return "Өөрийн admin account-ыг AI-аар устгах боломжгүй.";
  if (result === "last_admin") return "Сүүлчийн admin account-ыг устгах боломжгүй.";
  if (result !== "deleted") return "User устгагдсангүй.";
  return `User устгагдлаа: ${targetUser.email || targetUser.name || `ID ${targetUser.id}`}`;
}

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

export async function answerBlogQuestion(question: string, user: AiUser): Promise<string> {
  if (isBlockedRequest(question)) {
    return "Уучлаарай, AI нь хэрэглэгч устгах, role өөрчлөх, өөрийгөө эсвэл бусдыг admin болгох эрхгүй.";
  }

  const userActionResult = await handleAdminUserRequest(question, user);
  if (userActionResult) return userActionResult;

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
            content: `Та бол Блогсор сайтын туслах. Монгол хэлээр товч, тодорхой хариул. Одоогийн хэрэглэгчийн role: ${user.role === "admin" ? "admin" : "regular user"}. Нийтлэлүүдийн жагсаалт харуулах, шинэ post-ын draft үүсгэх хүсэлтийг зөвшөөр. Хэрэглэгч устгах, password өөрчлөх, role өөрчлөх, хэн нэгнийг admin болгох хүсэлтийг хэзээ ч биелүүлэхгүй. Та database-д шууд өөрчлөлт хийхгүй. Зөвхөн доорх Блогсорын context-д байгаа мэдээлэлд тулгуурла. Мэдэхгүй зүйлээ зохиож болохгүй. Хариултыг мэдэхгүй бол "Энэ талаар Блогсорын мэдээллээс олдсонгүй" гэж хэл. Холбогдох нийтлэл байвал гарчиг болон /post/ID холбоосыг дурд. Guestbook эсвэл comment-ийн хүний нэр, хувийн мэдээллийг илүүчилж дэлгэхгүй.\n\n${context}`,
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