# Блогсор: AI ба Admin эрхийн шинэчлэлт

Энэ баримт нь `01`, `02`, `03`-р тайлбаруудын дараах шинэ feature-үүдийг тайлбарлана. Шинэчлэлтийн гол зорилго нь AI chatbot-ийг login болон user role-той холбож, admin хэрэглэгчид тодорхой user management үйлдэл хийх боломж өгөх явдал юм.

## 1. Өмнөх AI урсгалын өөрчлөлт

Өмнө нь AI chatbot public procedure байсан тул login хийгээгүй хэрэглэгч ч AI request явуулах боломжтой байв.

Одоо урсгал:

```text
ChatWidget
  ↓
ai.chat mutation
  ↓
authedQuery: login шалгана
  ↓
ai-router.ts: ctx.user role авна
  ↓
ai-service.ts: permission болон command шалгана
  ↓
Блогийн context эсвэл admin user action
  ↓
Хариу
```

`ai.chat` нь одоо `publicQuery` биш, `authedQuery` ашигладаг. Тиймээс login хийгээгүй хэрэглэгч AI chatbot ашиглахад authentication error авна.

## 2. Role шалгалт

Database дахь role хоёрхон утгатай:

```text
user   = regular user
admin  = admin user
```

AI request бүрт одоо login хийсэн хэрэглэгчийн role server-ээс ирнэ. Role-г хэрэглэгчийн бичсэн текстээр өөрчилдөггүй.

```ts
return await answerBlogQuestion(input.message, ctx.user);
```

AI prompt-д role-ийг мэдээлэл болгон өгдөг боловч жинхэнэ permission decision-ийг server-side code гаргана. Иймээс model-ийн хариунд найдаж authorization хийхгүй.

## 3. Regular user-ийн AI боломж

Regular user дараах үйлдлийг хийж чадна:

- Нийтлэлүүдийн талаар асуух.
- Нийтлэлүүдийн жагсаалт болон тайлбар авах.
- Guestbook, comment-ийн public context-ээс асуулт асуух.
- Шинэ post-ын draft текст үүсгүүлэх.

Draft үүсгэх хүсэлт нь зөвхөн AI-ийн текст хариу юм. AI нь `post.create` mutation-ийг өөрөө дуудахгүй, тиймээс draft автоматаар database-д нийтлэл болж хадгалагдахгүй. Хэрэглэгч draft-ийг Write page дээр өөрөө шалгаж, хадгална.

## 4. Admin user-ийн нэмэлт боломж

Admin хэрэглэгч дээр regular user-ийн бүх боломж хэвээр байна. Нэмэгдсэн admin-only AI боломжууд:

### User мэдээлэл харах

Жишээ асуулт:

```text
user жагсаалт харуул
show users
user information харуул
```

AI дараах safe мэдээллийг харуулна:

```text
id
name
email
authorization role
```

Энэ мэдээллийг `listSafeUsers()` query projection ашиглан уншдаг. `passwordHash` query projection-оор хасагдана.

### Нэг user устгах

User-ийг тодорхой ID эсвэл email-ээр устгана.

```text
устга user 12
устга user test@example.com
```

AI зорилтот user тодорхойгүй бол устгал хийхгүй, ID эсвэл email нэхнэ. Бүх user устгах command тусдаа blocked request тул ажиллахгүй.

## 5. User deletion-ийн хамгаалалт

`deleteUserById()` query дараах шалгалтуудыг хийдэг:

1. User олдохгүй бол устгахгүй.
2. Admin өөрийн account-ыг өөрөө устгаж чадахгүй.
3. Сүүлчийн admin account-ыг устгахгүй.
4. Бүх user-ийг нэг дор устгах хүсэлтийг зөвшөөрөхгүй.
5. Зөвхөн тодорхой нэг user-ийн document-ийг устгана.

Эдгээр шалгалт frontend дээр биш query/server талд хийгддэг. Тиймээс өөр client эсвэл шууд request ашигласан ч үндсэн хамгаалалт хадгалагдана.

## 6. Password болон credential-ийн дүрэм

AI-д дараах өгөгдлийг хэзээ ч дамжуулахгүй:

- Plaintext password.
- `passwordHash`.
- Session secret.
- Database connection string.
- Cookie token.

Login үед password server дээр hash-тай харьцуулагддаг. Hash-ийг буцааж password болгох ёсгүй. Local environment байсан ч AI model-д credential өгөх нь chat log, model context, debug output зэрэгт нууц мэдээлэл тархах эрсдэлтэй.

Хэрэв password мартсан бол зөв шийдэл нь admin-only password reset flow нэмэх юм. Энэ нь хуучин password-ыг харуулахгүйгээр шинэ password тохируулна.

## 7. Хориглосон AI хүсэлтүүд

Дараах хүсэлтийг AI шууд татгалзана:

```text
Бүх user устга
Намайг admin болго
Make me admin
Delete all users
```

Мөн AI өөрөө role, password, permission өөрчлөхгүй. Admin role-г `.env` дахь `OWNER_EMAIL`-ээр шинэ register хийх үед эсвэл тусгай backend command-аар тохируулна.

```powershell
npm run db:make-admin -- your-email@example.com
```

Role өөрчлөгдсөний дараа logout/login хийж шинэ session үүсгэнэ.

## 8. Шинэ файлууд ба өөрчлөгдсөн давхаргууд

### `api/ai-router.ts`

- `publicQuery`-оос `authedQuery` болсон.
- `ctx.user`-ийг AI service рүү дамжуулдаг.

### `api/ai-service.ts`

- Login хийсэн user-ийн role ашиглана.
- Blocked request-үүдийг model дуудахаас өмнө тасална.
- Admin user list болон single-user delete intent-ийг танина.
- Admin биш хэрэглэгчийн user management хүсэлтийг хориглоно.

### `api/queries/users.ts`

- `listSafeUsers()`: password-гүй user list буцаана.
- `deleteUserById()`: self-delete болон last-admin хамгаалалттай user deletion хийнэ.

## 9. Шалгалтын checklist

Шинэ feature шалгахдаа:

1. Logout хийж AI ашиглахад `UNAUTHORIZED` гарах эсэхийг шалгана.
2. Regular user-ээр `user жагсаалт харуул` гэж асуухад permission error гарах эсэхийг шалгана.
3. Admin-ээр user list асуухад email, role харагдах эсэхийг шалгана.
4. `password` болон `passwordHash` response-д байхгүй эсэхийг шалгана.
5. Admin-ээр `устга user ID` хийхэд зөвхөн тэр user устсан эсэхийг шалгана.
6. Өөрийн admin account-ыг устгах оролдлого татгалзсан эсэхийг шалгана.
7. `Бүх user устга` blocked хэвээр эсэхийг шалгана.
8. `npm run check` болон `npm run build` ажиллуулна.

## 10. Одоогийн хязгаарлалт

Одоогийн AI user management нь natural-language intent болон regex pattern ашигладаг. Тиймээс хэрэглэгчийн хүсэлтийг зөв тодорхой хэлэх шаардлагатай. AI нь user list харах, нэг user устгах үйлдлийг дэмждэг боловч:

- role өөрчлөхгүй;
- password reset хийхгүй;
- олон user-ийг batch устгахгүй;
- post-ийг автоматаар publish/update/delete хийхгүй.

Эдгээрийг дараа нэмэх бол тусдаа typed tRPC procedure, Zod input validation, admin middleware, audit log болон frontend confirmation UI хэрэгтэй.
