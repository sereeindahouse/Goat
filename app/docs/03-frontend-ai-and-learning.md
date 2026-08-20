# Блогсор: Frontend, React state, tRPC hooks ба AI

Энэ файл хэрэглэгчийн үйлдэл дэлгэцээс backend хүртэл яаж явдгийг тайлбарлана.

## 1. React component гэж юу вэ?

React component бол UI-ийн нэг хэсгийг буцаадаг function.

```tsx
export default function Guestbook() {
  return <main>...</main>;
}
```

Component-ийн дотор:

- state: тухайн UI-ийн түр зуурын утга.
- query: server data унших.
- mutation: server data өөрчлөх.
- event handler: click/submit зэрэг хэрэглэгчийн үйлдэл.
- render: одоогийн state/data дээр үндэслэн UI буцаах.

## 2. State ба server data-ийн ялгаа

### Local state

`useState`-ээр хадгалсан зүйл зөвхөн browser component-ийн амьд байх хугацаанд байна.

Жишээ:

- form-ийн `name`, `message`.
- chatbot-ийн одоогийн messages.
- delete confirmation.
- modal нээлттэй эсэх.

Refresh хийхэд local state устна.

### Server data

MongoDB-оос ирсэн зүйл.

- posts.
- comments.
- guestbook entries.
- user profile.
- view/endorsement count.

Server data-г tRPC React Query cache түр хадгалж болно. Гэхдээ жинхэнэ эх үүсвэр нь MongoDB.

## 3. tRPC hook-ийн үндсэн хэлбэр

```tsx
const postsQuery = trpc.post.list.useQuery({ limit: 60 });

const createPost = trpc.post.create.useMutation({
  onSuccess: () => {
    utils.post.list.invalidate();
  },
});
```

Query-ийн чухал property:

- `data`: амжилттай ирсэн data.
- `isLoading`: эхний fetch явж байна.
- `error`: backend/network error.
- `refetch`: гараар дахин унших.

Mutation-ийн чухал property:

- `mutate(input)`: request эхлүүлнэ.
- `isPending`: request явж байна.
- `error`: validation эсвэл server error.
- `onSuccess`: амжилтын дараах ажил.

## 4. Guestbook-ийн бодит flow

```text
User name/message бичнэ
  ↓
React state шинэчлэгдэнэ
  ↓
form submit
  ↓
trpc.guestbook.create.mutate({ name, message })
  ↓
Zod validation
  ↓
Mongo guestbook.insertOne
  ↓
onSuccess
  ↓
form clear + guestbook.list.invalidate()
  ↓
шинэ list харагдана
```

Энд form state болон MongoDB data хоёрыг ялгаж ойлгох нь чухал. Input-ийн утга local state-д, илгээгдсэн бичлэг database-д байна.

## 5. Post detail-ийн view/like flow

### View

User login хийсэн, post detail нээгдсэн үед frontend `post.view` mutation дуудна. `postViews` unique record амжилттай үүсвэл counter нэмэгдэнэ. Refresh хийхэд ижил `postId + userId` duplicate тул counter нэмэгдэхгүй.

### Like

`post.hasEndorsed` query эхлээд тухайн user өмнө нь like хийсэн эсэхийг шалгана.

- `false`: button идэвхтэй.
- `true`: `ДЭМЖСЭН`, button disabled.
- anonymous user: login хийхийг санал болгоно.

Гэхдээ frontend disabled болсон ч хангалтгүй. Backend `postEndorsements` unique index давхар like-ийг эцэслэн хаана.

## 6. Home feed ба filter

`GenerativeCascade.tsx`:

1. `post.list`-ээр posts авна.
2. category filter хийж болно.
3. `sort=liked` үед endorsementCount-оор descending sort хийнэ.
4. 10 секундийн refetch interval-ээр feed count шинэчилнэ.
5. post card дээр comment, like, view count харуулна.

Энд filter нь database query биш, ирсэн feed дээрх frontend sort юм. Post олон мянга болсон үед backend sort хийхийг бодно.

## 7. AI chatbot яг яаж ажилладаг вэ?

AI model нь project-ийн кодыг өөрөө мэдэхгүй. `api/ai-service.ts` request бүр дээр database-ийн public мэдээллээс context бэлддэг.

```text
ChatWidget
  ↓ ai.chat mutation
ai-router.ts: message validation
  ↓
ai-service.ts: buildBlogContext()
  ↓
MongoDB:
  - бүх posts-ийн title/category/excerpt/content-ийн хэсэг
  - сүүлийн 30 guestbook
  - сүүлийн 50 comments
  ↓
Ollama /api/chat
  ↓
Qwen2.5 1.5B
  ↓
answer string
  ↓
ChatWidget message list-д нэмнэ
```

### RAG гэж юу вэ?

Энэ project-ийн арга нь training биш, context/RAG.

- Training: model-ийн дотоод parameter-ийг дахин сургана.
- RAG: асуулт бүрийн өмнө хэрэгтэй project data-г model-д түр өгнө.

Иймээс MongoDB-д шинэ post нэмэгдмэгц дараагийн AI асуултад тэр data context-д орж чадна. Model файлыг дахин train хийх шаардлагагүй.

### `Qwen2.5 1.5B` гэж юу вэ?

- Qwen2.5: model family-ийн нэр.
- 1.5B: ойролцоогоор 1.5 billion parameters.
- Parameter: model-ийн хэлний pattern, холбоо, шийдвэрийн жин.
- 1.5B нь жижиг тул 8 GB RAM-тэй компьютерт ажиллах боломжтой.
- Том model-оос бага чадалтай боловч local, үнэгүй, API key-гүй.

### AI data storage

Одоогийн ChatWidget-ийн chat history MongoDB-д хадгалагдахгүй.

- Browser refresh: chat history устна.
- Ollama: request дуусмагц энэ chat history-г өөрөө project storage болгохгүй.
- MongoDB: зөвхөн context болгон уншсан posts/comments/guestbook-ээ хадгалдаг; AI chat message тусдаа хадгалахгүй.
- Qwen model: Ollama-ийн local model storage-д ойролцоогоор 986 MB.

## 8. AI context-ийн limit

Одоогийн context хязгаар:

- user-ийн нэг message: 1000 тэмдэгт.
- нэг post-ийн context: 900 тэмдэгт хүртэл.
- guestbook: хамгийн сүүлийн 30.
- comments: хамгийн сүүлийн 50.

Эдгээр нь model-ийн context window болон 8 GB RAM-ийг хамгаална. Бүх database document-ийг бүтнээр нь нэг prompt-д оруулах нь удаан, RAM их хэрэглэж, хариу муутгах боломжтой.

## 9. ChatWidget-ийн UI logic

`ChatWidget.tsx`:

- `open`: panel харагдах эсэх.
- `message`: input field-ийн одоогийн утга.
- `messages`: user/assistant chat bubble-уудын local array.
- `chat.isPending`: AI бодож байх үеийн loading text.
- `chat.error`: Ollama асахгүй эсвэл model байхгүй үеийн error.

Chat button нь App-д global mount хийгдсэн тул бүх route дээр харагдана.

## 10. Frontend error state

API ажиллахгүй үед UI-г хоосон орхихгүй.

Ерөнхий pattern:

```tsx
if (query.isLoading) return <Loading />;
if (query.error) return <ErrorMessage />;
if (!query.data) return <EmptyState />;
return <Content data={query.data} />;
```

Одоогийн зарим page inline style, зарим нь Tailwind ашигладаг. Шинэ code нэмэхдээ тухайн ойролцоох component-ийн style pattern-ийг дагана.

## 11. Feature хийхэд сурах дараалал

1. UI дээр ямар user action болохыг зур.
2. Тэр action ямар data үүсгэх/уншихыг schema-гаар тодорхойл.
3. Backend query бич.
4. Router input болон permission нэм.
5. `appRouter`-т бүртгэ.
6. Frontend tRPC hook холбо.
7. loading, error, empty, success state хий.
8. mutation-ийн дараа related query invalidate хий.
9. TypeScript/build ажиллуул.

## 12. Түгээмэл алдаанууд

### “UI дээр count өөрчлөгдөхгүй байна”

Mutation амжилттай болсон ч query cache invalidate хийгдээгүй байх магадлалтай.

### “Refresh бүр view нэмэгдэж байна”

View increment-ийг `byId` query дотор хийсэн эсэхийг шалгана. Read query side effect хийх ёсгүй. Одоогийн зөв шийдэл нь тусдаа authenticated mutation + unique record.

### “Anonymous user permission error авлаа”

Тухайн procedure `authedQuery` эсэхийг шалга. Public унших үйлдэлд `publicQuery` хэрэглэнэ.

### “AI худал хариулж байна”

AI-д context-оос гадуур хариу зохиохгүй гэж system prompt-д заасан ч жижиг model алдаа гаргаж болно. Context илүү relevant болгох, question keyword-оор post сонгох, эсвэл том model ашиглах боломжтой.
