# Блогсор (Blogsor) — Төслийн Бүрэн Архитектур ба Системийн Гарын Авлага

Энэхүү баримт бичиг нь **Блогсор (Blogsor)** full-stack веб аппликейшны архитектур, өгөгдлийн урсгал, технологийн стек, AI интеграци, аюулгүй байдлын зарчмуудыг бүрэн дэлгэрэнгүй тайлбарлана.

---

## 🧭 1. Төслийн ерөнхий газрын зураг & Архитектурын бүдүүвч

```text
[ Browser / React 19 UI ] 
        │
        ▼ (Type-Safe tRPC v11 / SuperJSON)
[ Hono HTTP Server: api/boot.ts ]
        │
        ├── Session & Authentication Middleware (Cookie & Role Guards)
        ▼
[ Root AppRouter: api/router.ts ]
        ├── authRouter        ───► api/queries/users.ts
        ├── postRouter        ───► api/queries/posts.ts
        ├── bookmarkRouter    ───► api/queries/bookmarks.ts
        ├── commentRouter     ───► api/queries/comments.ts
        ├── guestbookRouter   ───► api/queries/guestbook.ts
        ├── groupRouter       ───► api/queries/groups.ts
        ├── messageRouter     ───► api/queries/messages.ts
        ├── notificationRouter───► api/queries/notifications.ts
        └── aiRouter          ───► api/ai-service.ts ───► [ Google Gemini 3.6 Flash API ]
                                                              │ (Fallback)
                                                              ▼
                                                        [ Local Ollama ]
        │
        ▼ (MongoDB Atlas / Replica Set)
[ Collections: users, posts, bookmarks, postViews, postEndorsements, comments, guestbook, groups, messages, notifications... ]
```

---

## 🛠️ 2. Технологийн стек & Сонголтын шалтгаан

| Давхарга | Технологи | Гол үүрэг & Онцлог |
|---|---|---|
| **Frontend Framework** | **React 19, Vite** | Орчин үеийн React features, маш хурдан HMR хөгжүүлэлт |
| **Styling & Icons** | **Tailwind CSS, Lucide React** | Минимал brutalist & dark-mode дизайн, цэвэр вектор дүрсүүд |
| **Visual Effects** | **Three.js (WebGL Shaders), GSAP** | Нүүр хуудасны шингэн WebGL fluid shader хөдөлгөөн |
| **API & Data Layer** | **tRPC v11, SuperJSON, Zod** | End-to-end 100% Type-Safety, backend/frontend автомат type sync |
| **Backend Server** | **Hono** | Хөнгөн жинтэй, өндөр бүтээмжтэй Node.js HTTP сервер |
| **Database** | **MongoDB Atlas / Native Driver** | Баримтад суурилсан NoSQL өгөгдлийн сан, Compound Unique Index |
| **AI Integration** | **Google Gemini 3.6 Flash** | Монгол хэлээр маш хурдан нийтлэл боловсруулах, хураангуйлах, чат |

---

## 🗄️ 3. Өгөгдлийн бүтэц & MongoDB Collections

1. **`users`**: Хэрэглэгчийн бүртгэл, `unionId`, нэр, имэйл, аватар зураг, `scrypt` алгоритмаар хамгаалагдсан `passwordHash`, role (`user` | `admin`).
2. **`posts`**: Нийтлэлүүд (`title`, `excerpt`, `content`, `category`, `coverImage`, `viewCount`, `endorsementCount`, `groupId`).
3. **`bookmarks`**: Хэрэглэгчийн хадгалсан нийтлэлүүд. `{ postId, userId }` дээр `unique: true` индексээр давхардалгүй хадгална.
4. **`postViews` & `postEndorsements`**: Зөвхөн counter тоолох биш, нэг хэрэглэгч нэг нийтлэлийг нэг л удаа үзэж/дэмжих найдвартай бүртгэл.
5. **`comments`**: Нийтлэлийн сэтгэгдлүүд (`postId`, `authorId`, `content`, `createdAt`).
6. **`guestbook`**: Нээлттэй Зочны дэвтрийн бичлэгүүд (`name`, `message`, `authorId`).
7. **`groups`, `groupMembers`, `groupInvites`, `groupJoinRequests`**: Олон нийтийн ба хувийн Group-ийн бүтэц.
8. **`conversations` & `messages`**: Хэрэглэгч хоорондын шууд хувийн зурвасууд (Direct Messages).
9. **`notifications`**: Шинэ нийтлэл, урилга, зурвасын тухай бодит цагийн мэдэгдлүүд.
10. **`_counters`**: MongoDB ObjectId-ийн оронд хүний нүдэнд ээлтэй богино тоон ID (`1, 2, 3...`) үүсгэх `$inc` counter.

---

## 🎨 4. Frontend-ийн хуудсууд & Бүтэц

* `/` — Үндсэн нүүр хуудас (Three.js WebGL Simplex Noise Fluid Hero, шилдэг нийтлэлүүд).
* `/main` — Бүх нийтлэлийн урсгал (Feed, Категориор шүүх, Нийтлэл ба Хүн хайх tab).
* `/post/:id` — Нийтлэлийн дэлгэрэнгүй:
  * 🤖 **AI 3 гол санааны хураангуй (TL;DR Summary)**
  * 🔖 **Хадгалах (Bookmark)** товч
  * 👍 **Ур чадварыг дэмжих (Endorse)** ба Үзэлт тоологч
  * 📤 **Social Share** (Telegram, Facebook, Линк хуулах)
  * 💬 **Сэтгэгдлийн систем** (Устгах эрхийн шалгалттай)
  * 💡 **Санал болгох нийтлэлүүд** (Related posts)
* `/write` ба `/edit/:id` — Нийтлэл бичих & засах хуудас:
  * 💡 **AI Гарчиг санал болгох**
  * 📝 **AI Товчлол үүсгэх**
  * ✨ **AI Зөв бичих дүрэм засах**
  * 🖼️ **Компьютерээс зураг оруулах & автомат compress**
* `/profile/:id` — Хэрэглэгчийн профайл, бичсэн нийтлэлүүд болон **Хадгалсан нийтлэлүүдийн (Bookmarks)** жагсаалт.
* `/groups` — Бүлгэм үүсгэх, нэгдэх, гишүүд урих.
* `/messages` — Шууд чат (DM).
* `/guestbook` — Зочны дэвтэрт сэтгэгдэл үлдээх.

---

## 🧠 5. AI Архитектур (Google Gemini 3.6 Flash & Fallback)

AI систем нь `app/api/ai-service.ts` файлд төвлөрсөн бөгөөд 3 үндсэн үүрэгтэй:

### 1. Блогсор AI Чатбот
* Блогийн сүүлийн 30 нийтлэл, сэтгэгдэл, зочны дэвтрийн өгөгдлийг контекст болгон ашиглана.
* Зөвхөн Монгол хэлээр, бодит нийтлэлийн холбоос (`/post/ID`)-ийг зааж, баримтад тулгуурлан хариулна.

### 2. AI Writing Assistant
* `action = "title"`: Нийтлэлийн агуулгаас 3 шилдэг гарчиг санал болгоно.
* `action = "excerpt"`: 1 өгүүлбэр товч танилцуулга бэлдэнэ.
* `action = "proofread"`: Утгыг өөрчлөхгүйгээр зөв бичих дүрэм, найруулгын алдааг засна.

### 3. AI Нийтлэлийн 3 гол санааг хураангуйлах (TL;DR)
* Уншигч урт нийтлэлийг нээхэд 3 цэгт багтаан агуулгыг товчлон харуулна.

---

## 🛡️ 6. Аюулгүй байдал & Өгөгдлийн хамгаалалт

1. **HttpOnly Cookie Authentication**:
   * `blogsor_sid` нэртэй cookie ашигладаг. JavaScript-ээс шууд уншигдахгүй тул XSS халдлагаас хамгаалагдсан.
2. **Deterministic AI Guardrails**:
   * Хэрэглэгч чатботод "Намайг админ болго", "Бүх хэрэглэгчийг устга" гэх мэт заавар өгсөн ч prompt injection-д хууртахгүй. Эрсдэлтэй тушаалуудыг LLM-д хүрэхээс өмнө Regex болон Backend Permission layer шууд таслан зогсооно.
3. **Cascade Deletion (Цэвэрлэгээ)**:
   * Нийтлэл устгахад түүнтэй холбоотой `comments`, `postViews`, `postEndorsements`, `bookmarks` бүгд зэрэг цэвэрлэгдэж өгөгдлийн сан бохирдохгүй.

---

## 🚀 7. Хөгжүүлэлт ба Ажиллуулах командууд

```powershell
# Хөгжүүлэлтийн горимд асаах
npm run dev

# TypeScript type check шалгах
npm run check

# Production bundle бэлдэх
npm run build

# Seed өгөгдөл оруулах
npm run db:seed

# Хэрэглэгчийг Admin болгох
npm run db:make-admin -- email@example.com
```

