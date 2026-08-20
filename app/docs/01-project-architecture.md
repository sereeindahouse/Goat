# Блогсор: Төслийн архитектур ба кодын бүтэц

Энэ файл төслийг бүхэлд нь харах газрын зураг юм. Код уншихдаа эхлээд энэ файлыг уншаад дараа нь backend эсвэл frontend-ийн нарийвчилсан файлууд руу орно.

## 1. Төслийн зорилго

Блогсор бол:

- хэрэглэгч нийтлэл унших;
- бүртгүүлж, нэвтрэх;
- нийтлэл бичих, засах, устгах;
- нийтлэлд сэтгэгдэл үлдээх;
- зочны дэвтэрт нэр, мессеж үлдээх;
- нийтлэлийг нэг удаа `👍`-аар дэмжих;
- login хэрэглэгчийн нийтлэл үзэлтийг нэг удаа бүртгэх;
- локал Ollama AI-аас блогийн мэдээллийн талаар асуух

боломжтой full-stack веб аппликейшн юм.

## 2. Ерөнхий урсгал

```text
Browser / React UI
        |
        |  tRPC HTTP request: /api/trpc
        v
Hono server: api/boot.ts
        |
        v
appRouter: api/router.ts
        |
        +--> authRouter       -> api/queries/users.ts, auth/session.ts
        +--> postRouter       -> api/queries/posts.ts
        +--> commentRouter    -> api/queries/comments.ts
        +--> guestbookRouter  -> api/queries/guestbook.ts
        +--> aiRouter         -> api/ai-service.ts -> Ollama
        |
        v
MongoDB: users, posts, comments, guestbook, counters,
         postViews, postEndorsements
```

Нэг чухал санаа: frontend MongoDB-тэй шууд холбогдохгүй. Бүх өгөгдлийн хүсэлт backend router-аар дамжина.

## 3. Үндсэн folder-ууд

```text
app/
├── api/              Backend server, router, database query
├── contracts/        Frontend/backend хамт ашиглах type ба constants
├── db/               MongoDB document-ийн TypeScript schema, seed
├── src/              React frontend
├── public/           Browser шууд авах зураг, видео
├── docs/             Энэ сургалтын баримтууд
├── package.json      Script болон dependency
├── vite.config.ts    Vite + Hono dev server + alias
└── tsconfig*.json    TypeScript тохиргоо
```

## 4. Backend folder

### `api/boot.ts`

Server-ийн entry point. Hono app үүсгээд:

1. request body-ийн 50 MB limit тавина;
2. `/api/trpc/*` хүсэлтийг tRPC handler руу дамжуулна;
3. `createContext`-ээр request бүрийн login user-ийг танина;
4. production үед static frontend-ийг serve хийнэ;
5. production server-ийг `PORT` дээр асаана.

Энд business logic бичихгүй. Энэ файл wiring буюу холболтын үүрэгтэй.

### `api/router.ts`

Бүх tRPC router-ийн root.

```ts
export const appRouter = createRouter({
  auth: authRouter,
  post: postRouter,
  comment: commentRouter,
  guestbook: guestbookRouter,
  ai: aiRouter,
});
```

Frontend-ийн `AppRouter` type энэ root-оос үүсдэг. Тиймээс router-д procedure нэмэхэд frontend hook автоматаар type-тэй болно.

### `api/middleware.ts`

Procedure-ийн permission layer.

- `publicQuery`: login шаардахгүй.
- `authedQuery`: login байхгүй бол `UNAUTHORIZED` буцаана.
- `adminQuery`: admin role шаардана.

Жишээ:

```ts
list: publicQuery.query(...)
create: authedQuery.input(schema).mutation(...)
```

### `api/context.ts`

Request бүрийн context үүсгэнэ. Cookie доторх session-ээр хэрэглэгчийг таних гэж оролдоно. Login байхгүй бол `ctx.user` нь undefined хэвээр үлдэнэ. Энэ нь public endpoint-үүдийг anonymous хэрэглэгчид ажиллуулах боломж өгдөг.

### `api/auth/session.ts`

Session cookie-г үүсгэх, шалгах, устгах хэсэг. Нууц үг болон cookie-ийн нарийн логик router дотор биш энд тусгаарлагдсан.

## 5. Frontend folder

### `src/main.tsx`

React app-ийн хамгийн эхний entry point.

```text
BrowserRouter
  └── TRPCProvider
        └── App
```

- `BrowserRouter`: URL route удирдана.
- `TRPCProvider`: backend procedure-үүдийг React hook болгоно.
- `App`: header, chatbot, page route-уудыг байрлуулна.

### `src/App.tsx`

Route registry буюу URL аль page рүү очихыг шийддэг.

- `/`: Home
- `/post/:id`: PostDetail
- `/write`: шинэ нийтлэл
- `/edit/:id`: нийтлэл засах
- `/guestbook`: Guestbook
- `/login`: Login
- `/profile/:id`: Profile

`App.tsx` өөрөө өгөгдөл боловсруулахгүй, зөвхөн page/component-үүдийг холбодог.

### `src/pages/`

Нэг route-ийн дэлгэц бүр нэг page component-той.

- `Home.tsx`: үндсэн нүүр, visual sections.
- `PostDetail.tsx`: нэг нийтлэл, view, endorsement, comments.
- `Write.tsx`: нийтлэл create/update form.
- `Profile.tsx`: user мэдээлэл болон тухайн user-ийн posts.
- `Guestbook.tsx`: guestbook list/create/delete.
- `Login.tsx`: login/register.
- `NotFound.tsx`: буруу route.

### `src/components/`

Олон page-д дахин ашиглагдах UI.

- `SiteHeader.tsx`: logo, navigation, auth state.
- `ChatWidget.tsx`: floating AI chat.
- `ui/`: Radix/shadcn суурьтай жижиг UI components.

### `src/sections/`

Home page-ийн том visual хэсгүүд.

- `FluidSubconscious.tsx`: Three.js fluid effect.
- `GenerativeCascade.tsx`: post feed, category, liked sort, view/like stats.
- `HeroOverlay.tsx`, `DeepSpaceFold.tsx`: visual content sections.
- `CustomCursor.tsx`: cursor effect.

Visual effect эвдэрсэн үед ихэвчлэн `sections/`-ээс хайна. Өгөгдлийн алдаа үед `api/queries/` болон router-оос хайна.

## 6. Нэг feature нэмэх ерөнхий дүрэм

Жишээ нь шинэ `bookmark` feature нэмэхэд дараах дарааллаар бодно:

1. Data ямар document болохыг `db/schema.ts`-д тодорхойлно.
2. MongoDB query-г `api/queries/bookmarks.ts`-д бичнэ.
3. Validation болон permission-ийг `api/bookmark-router.ts`-д бичнэ.
4. Root router-т `bookmark: bookmarkRouter` нэмнэ.
5. Frontend page/component дээр `trpc.bookmark...` hook ашиглана.
6. Амжилттай mutation-ийн дараа `utils...invalidate()` хийнэ.
7. `npm run check`, targeted lint, `npm run build` ажиллуулна.

Router дотор MongoDB query-г шууд бичихээс зайлсхий. Query болон permission хоёрыг салгавал код унших, test хийх, дахин ашиглах амар болно.

## 7. Хөгжүүлэлтийн командууд

```powershell
cd "C:\Users\sekba\Downloads\Kimi_Agent_Блог_КМС\app"
npm install
npm run dev       # development frontend + Hono API
npm run check     # TypeScript
npm run lint      # бүх repository lint
npm run build     # frontend + production API bundle
npm run db:seed   # seed data оруулах
npm test          # test file байвал ажиллуулна
```

Орон нутгийн MongoDB болон Ollama тусдаа ажиллах ёстой. `.env`-д `MONGODB_URI` байхгүй бол database query ажиллахгүй.
