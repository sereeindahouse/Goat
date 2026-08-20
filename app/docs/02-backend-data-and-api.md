# Блогсор: Backend, MongoDB, CRUD ба API

Энэ файл backend кодыг request орж ирэхээс MongoDB-д хадгалагдах хүртэл тайлбарлана.

## 1. Backend-ийн давхаргууд

```text
HTTP request
   ↓
Hono / tRPC adapter
   ↓
Router: validation + permission + business decision
   ↓
Query: MongoDB read/write
   ↓
MongoDB collection
```

Давхарга бүр өөрийн үүрэгтэй:

- Hono: HTTP server.
- tRPC: procedure нэр, input/output type.
- Zod: input validation.
- Middleware: authentication/role.
- Router: энэ request зөвшөөрөгдөх эсэх.
- Query: database-ийн бодит унших/өөрчлөх ажил.
- MongoDB: persistent storage.

## 2. tRPC гэж юу вэ?

Энд REST endpoint-ийн оронд typed procedure ашиглаж байна.

Backend:

```ts
list: publicQuery
  .input(z.object({ limit: z.number().optional() }))
  .query(({ input }) => listPosts(input?.limit ?? 60))
```

Frontend:

```ts
const postsQuery = trpc.post.list.useQuery({ limit: 60 });
```

Нэг `AppRouter` type backend procedure-ийг frontend-д дамжуулдаг. Тиймээс frontend-д гараар `/api/posts` URL, response interface бичих шаардлага багасна.

## 3. Query ба mutation

- `query`: data уншина. Жишээ: `post.list`, `post.byId`.
- `mutation`: data өөрчилнө. Жишээ: `post.create`, `comment.delete`.

Mutation дууссаны дараа frontend cache хуучин байж болно. Тиймээс:

```ts
onSuccess: () => {
  utils.post.list.invalidate();
}
```

гэж тухайн query-г дахин fetch хийлгэдэг.

## 4. Zod validation

Client дээр `required` тавьсан ч backend validation заавал байх ёстой. Учир нь backend endpoint-ийг browser-оос гадна өөр client дуудаж болно.

`postInput`-ийн жишээ:

- title: trim хийж, хамгийн багадаа 3 тэмдэгт.
- excerpt: хамгийн ихдээ 500.
- content: хамгийн багадаа 10.
- category: зөвшөөрсөн enum-ийн нэг.
- coverImage: optional/null.

Validation амжилтгүй бол mutation database-д хүрэхээс өмнө зогсоно.

## 5. Authentication flow

```text
Login form
  ↓ auth.login mutation
users collection шалгах
  ↓
session үүсгэх
  ↓
blogsor_sid cookie
  ↓
дараагийн request-ийн context.user
```

`authedQuery` хэрэглэсэн procedure-д:

```ts
if (!ctx.user) throw UNAUTHORIZED;
```

гэсэн middleware автоматаар ажиллана.

Жишээ permission:

- Нийтлэл унших: public.
- Нийтлэл үүсгэх: login.
- Нийтлэл засах/устгах: owner эсвэл admin.
- Comment үүсгэх: login.
- Guestbook create: public.
- Like/view: login.

## 6. MongoDB collections

### `users`

Login болон profile-ийн user document.

Гол талбарууд:

```text
id, unionId, name, email, avatar, passwordHash,
role, createdAt, updatedAt, lastSignInAt
```

`passwordHash`-ийг frontend рүү буцаах ёсгүй.

### `posts`

Нийтлэлийн үндсэн document.

```text
id, authorId, title, excerpt, content, category,
coverImage, endorsementCount, viewCount,
createdAt, updatedAt
```

`authorId` нь users collection-ийн `id`-г заасан application-level reference юм. MongoDB-ийн SQL foreign key шиг автоматаар хамгаалагддаггүй тул query layer author-ийг тусад нь уншиж нийлүүлдэг.

### `comments`

```text
id, postId, authorId, content, createdAt
```

Comment list хийхдээ postId-оор filter хийнэ. Author мэдээллийг users-ээс нэмнэ.

### `guestbook`

```text
id, name, message, authorId, createdAt, updatedAt
```

`authorId` нь anonymous бичлэг дээр `null` байж болно.

### `_counters`

MongoDB ObjectId ашиглахын оронд application-level number ID үүсгэх counter.

```text
{ _id: "posts", value: 12 }
```

`nextId("posts")` нь `$inc` ашигладаг тул зэрэгцээ request-д давхар ID гаргахгүй.

### `postViews`

Нэг login user нэг post-ийг нэг удаа үзсэн record.

```text
{ postId, userId, createdAt }
```

`postId + userId` дээр unique index байгаа тул refresh хийхэд duplicate insert болохгүй.

### `postEndorsements`

Нэг user нэг post-д нэг удаа `👍` дарсан record.

```text
{ postId, userId, createdAt }
```

Энэ нь зөвхөн counter хадгалахаас илүү найдвартай. Зөвхөн counter байвал аль user аль хэдийн like хийснийг мэдэх боломжгүй.

## 7. CRUD гэж юу вэ?

CRUD нь database-ийн 4 үндсэн үйлдэл:

- Create: шинэ document insert.
- Read: document find/list.
- Update: document update.
- Delete: document устгах.

### Post CRUD-ийн жишээ

`api/post-router.ts`:

- `post.list`: list/read.
- `post.byId`: нэг post/read.
- `post.create`: create.
- `post.update`: update.
- `post.delete`: delete.

Router эхлээд input болон permission шалгаад query function дуудна. `api/queries/posts.ts` MongoDB syntax-ийг агуулна.

## 8. View ба endorsement яагаад хоёр collection-той вэ?

Зөвхөн `posts.viewCount += 1` гэвэл:

- хэн үзсэнийг мэдэхгүй;
- refresh бүр нэмэгдэнэ;
- нэг user-ийг нэг удаа тоолох боломжгүй.

Одоогийн зөв урсгал:

```text
login user post нээнэ
  ↓
post.view mutation
  ↓
postViews дээр { postId, userId } insert оролдоно
  ↓
unique index duplicate биш бол posts.viewCount + 1
  ↓
duplicate бол count өөрчлөгдөхгүй
```

Endorsement яг ижил зарчимтай. Database unique index нь frontend button-оос гадна backend түвшинд хамгаалалт болдог.

## 9. MongoDB connection

`api/queries/connection.ts` дотор MongoClient нэг удаа үүсэж, дахин ашиглагдана. `getDb()` эхний connection үед index-үүдийг үүсгэнэ.

Шаардлагатай environment:

```env
MONGODB_URI=mongodb://...
MONGODB_DATABASE=blogsor
APP_SECRET=replace-this-in-real-deployment
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
```

`MONGODB_URI` production үед заавал байна. Database connection байхгүй үед page query error гарна.

## 9.1. Root/admin user тохируулах

AI chatbot-д secret command хэлж admin болгохгүй. Role-г backend болон database удирдана.

### Шинээр бүртгүүлэх owner

`.env` файлд:

```env
OWNER_EMAIL=your-email@example.com
```

Дараа нь яг энэ email-ээр register хийхэд account-ийн `role` нь `admin` болно. Бусад бүртгэл `user` хэвээр байна.

### Одоо байгаа account-ийг admin болгох

```powershell
npm run db:make-admin -- your-email@example.com
```

Энэ command зөвхөн тэр email-тэй existing user-ийн `role`-ийг `admin` болгоно. Account олдохгүй бол алдаа гаргана. Role өөрчлөгдсөний дараа logout/login хийж шинэ session үүсгэнэ.

Admin эрхийг AI-д өгөхгүй. AI нь зөвхөн блогийн context уншиж хариулна; user role, password, database permission өөрчлөх endpoint түүнд байхгүй.

## 10. Шинэ backend feature debugging

1. Browser Network-оос tRPC request нэрийг ол.
2. `api/router.ts` дотор root-д бүртгэгдсэн эсэхийг шалга.
3. Router-ийн `.input()` validation-г шалга.
4. `publicQuery` эсвэл `authedQuery` зөв үү гэдгийг шалга.
5. Query function-ийн Mongo filter, projection, sort-ийг шалга.
6. MongoDB collection/index байгаа эсэхийг шалга.
7. Mutation-ийн дараа frontend query invalidate хийж байгаа эсэхийг шалга.
8. `npm run check`, build ажиллуул.
