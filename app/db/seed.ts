import { getDb, nextId } from "../api/queries/connection";
import type { Comment, Post, User } from "./schema";

const EDITORIAL_UNION_ID = "blogsor-editorial";

const SEED_POSTS = [
  {
    title: "Яагаад бичих хэрэгтэй вэ?",
    excerpt: "Бичих нь бодох хамгийн хүчтэй хэрэгсэл — өдөр бүр бага багаар бичих дадлын тухай.",
    category: "Бодлого",
    coverImage: "/images/cover-3.jpg",
    content: `Бичих гэдэг зүгээр нэг үгсийг эгнүүлэн дараалуулах бус, бодлоо цэгцлэх хамгийн хүчтэй арга юм. Толгойд тодорхой мэт санагддаг зүйл цаасан дээр гармагц л алдаа, зөрчил нь илэрдэг.

## Өдөр бүр бага багаар

Хоногт 200 үг бичих нь жилд 73,000 үг гэсэн үг — нэг номтой тэнцэх хэмжээ. Чухал нь чанар биш, тогтмол байдал. Эхлээд хэн ч уншихгүй гэж бодоод чөлөөтэй бич.

- Өглөө 15 минут чирвэлгүй бичих
- Төгс биш, тэмдэглэл шиг бичих
- Долоо хоног бүр нэг удаа нийтлэх

## Бичих нь уншихаас эхэлдэг

Сайн бичдэг хүмүүс сайн уншдаг. Гэхдээ идэвхтэй унших хэрэгтэй — өөрт таалагдсан өгүүлбэрийг тэмдэглэж, яагаад таалагдсаныг нэг өгүүлбэрээр бичиж заншаарай.`,
  },
  {
    title: "React-ийн сүүлийн хөгжүүлэлт: Server Components бодит амьдрал дээр",
    excerpt: "Server Components-ийг жижиг төсөл дээр хэрхэн зөв ашиглах тухай практик туршлага.",
    category: "Технологи",
    coverImage: "/images/cover-1.jpg",
    content: `React Server Components гарахдаа маш их амлалт өгсөн: багцын хэмжээ багасна, өгөгдөл шууд татна, SEO сайжирна. Бодит амьдрал дээр бол аль хэсэгт сервер, аль хэсэгт клиент компонент ашиглахаа ойлгох нь илүү чухал болж байна.

## Хаана юу ашиглах вэ

Сервер компонент нь статик контент, өгөгдлийн таталтад тохиромжтой. Харин интерактив элементүүд — форм, товч, анимаци — клиентээр хэвээр.

- Жагсаалт, нийтлэл, профайл → сервер
- Форм, like товч, realtime → клиент
- Холимог хэсгийг тусгаарлах нь архитектурыг цэвэрхэн байлгана

## Хамгийн их гардаг алдаа

"Ажиллаж байгаа бол оролдох хэрэггүй" гэх бодлого нүхтэй усны онгоц шиг. Клиент талд хэтэрхий их зүйл төвлөрвөл bundle томорно. Тусгаарлалтыг эрт хийж сур.`,
  },
  {
    title: "Тал нутгийн нам гүехэн нар",
    excerpt: "Аяллын тэмдэглэл: хөдөө гармагц цаг хугацаа өөр хурдтай болдог тухай.",
    category: "Аялал",
    coverImage: "/images/cover-2.jpg",
    content: `Хотын чимээнээс 300 километрийн зайд цаг хугацаа өөр хурдтай болдог. Гар утасны дохио алга болмогц л анх удаа ариун дуу чимээг сонсож байгаа юм шиг санагдсан.

## Гэрт хоносон шөнө

Гэрийн дотор уламжлалт цагаан цагаан, зүгээр нэг цагаан. Төвөөс нь харах тэнгэр, хазгай модны уран баримал, хотхон дэх амьдрал. Хонин мясаар хооллож, сүү цай ууж, оддын дор ярилцав.

- Өглөө болгон бугын дуу сонсогдоно
- Агаар мандалд цэлүүлэг гээд байдаг
- Шөнө Сүүн зам тод харагдана

## Хот руу буцаж ирэхдээ

Аяллаас авчирсан хамгийн үнэ цэнэтэй зүйл бол зураг бус, амьсгалах мөч юм. Бид яарах хэрэгтэй гэдэг итгэл заримдаа л хамгийн их чимээг үүсгэдэг.`,
  },
  {
    title: "Өгөгдөл сөрөг бус, урсгал юм",
    excerpt: "Шийдвэр гаргалтад өгөгдлийг хэрхэн зөв унших тухай — мэдрэмж ба тооны хоорондох тэнцвэр.",
    category: "Технологи",
    coverImage: "/images/cover-5.jpg",
    content: `Өгөгдөл гэдэг зүйлийг бид ихэвчлэн "баримт" гэж андуурдаг. Гэвч өгөгдөл бол урсгал — тодорхой цаг агшинд, тодорхой аргаар цуглуулсан харагдац.

## Тоог итгэмжтэй болгох гурван асуулт

- Хэн, яаж цуглуулсан бэ?
- Юу орхигдсон бэ?
- Өөр ямар тайлбар боломжтой вэ?

## Мэдрэмж ч мөн өгөгдөл

Ажилтны сэтгэл ханамж, хэрэглэгчийн дуудлага — эдгээр ч өгөгдөл. Зөвхөн хүснэгт дэх тоо биш, ярилцлагын доторх аяас ч шийдвэрт нөлөөлдөг. Шилдэг шийдвэр гаргагчид хоёуланг нь уншдаг.`,
  },
  {
    title: "Зураггүй бичих: минимал нийтлэлийн хүч",
    excerpt: "Зөвхөн үг, зөвхөн бодол. Хэт чимээгүй контентын загварын тухай.",
    category: "Урлаг",
    coverImage: "/images/cover-4.jpg",
    content: `Нүүр хуудас бүр хүн бүрийг чанга орилж, зураг бүр анхаарал сарниулж байхад цэвэр текст нь нам дуугүй хүч болж чаддаг.

## Цагаан завсарын загвар

Минимал бичвэрийн мөн чанар — юу хасахаа мэдэх явдал. Нэг сайн өгүүлбэр арван дунд зэрэг өгүүлбэрийг ялна. Уншигчийн цагийг хамгийн үнэ цэнэтэй валют гэж үзээрэй.

## Энэ талбарын тухайд

Блогсор нь зурагтай ч, зураггүй ч нийтлэлийг ижил хүндэтгэдэг. Ковер зураг бол хаалга бус, урилга. Жинхэнэ утга бол үгсийн дунд байдаг.`,
  },
  {
    title: "Бичвэрийн урлаг: бичиг бол нүдний хөдөлгөөн",
    excerpt: "Монгол бичгийн босоо урсгал биднийг хэрхэн өөрөөр уншдаг тухай.",
    category: "Урлаг",
    coverImage: "/images/cover-6.jpg",
    content: `Монгол бичиг бол дэлхийн цорын ганц босоо бичиг биш ч, хамгийн урт туульстай нэгэн. Үсэг бүр дээдээс доош урсахдаа уншигчийн нүдийг байгалийн урсгал шиг дагуулдаг.

## Босоо урсгалын философи

Хэвтээ бичиг нүдийг зүүнээс баруун тийш "түлхдэг" бол босоо бичиг нүдийг дээрээс доош "унагаддаг". Энэ нь ус урсах, мод ургах чиглэлтэй ижил — байгалын дараалал.

- Үсэг бүрийн холбоос урсгал тасралтгүй
- Бичээс бүхэлдээ нэг дүрс мэт
- Дууриа бол бичгийн хөгжим

Бичиг бол зүгээр нэг хэрэгсэл бус — нүдний хөдөлгөөн, гарын бүжиг, оюуны хэлбэр.`,
  },
];

const SEED_COMMENTS: { postIndex: number; author: string; content: string }[][] = [
  [
    { postIndex: 0, author: "reader", content: "Хоногт 200 үг гэдэг тоо намайг огшоолоо. Өнөөдрөөс эхлэе!" },
    { postIndex: 0, author: "reader2", content: "\"Төгс биш, тэмдэглэл шиг бичих\" — энэ өгүүлбэр их таалагдлаа." },
  ],
  [
    { postIndex: 1, author: "reader", content: "Server Components-ийн заагийг энэ мэт тодорхой тайлбарласан нийтлэл ховор шүү. Баярлалаа." },
  ],
  [
    { postIndex: 2, author: "reader2", content: "Уншаад л нутгийн агаар мэдрэгдлээ. Сайхан тэмдэглэл байна." },
    { postIndex: 2, author: "reader", content: "Зургууд нь гоё байна, дараагийн бүлгийг хүлээж байна." },
  ],
];

async function seed() {
  const db = await getDb();
  console.log("Seeding database...");

  // Editorial author
  const usersCollection = db.collection<User>("users");
  const postsCollection = db.collection<Post>("posts");
  const commentsCollection = db.collection<Comment>("comments");
  let author: User | null = await usersCollection.findOne({ unionId: EDITORIAL_UNION_ID });
  if (!author) {
    const now = new Date();
    const newAuthor: User = {
      id: await nextId("users"),
      unionId: EDITORIAL_UNION_ID,
      name: "Блогсор редакци",
      email: "editorial@blogsor.mn",
      avatar: null,
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignInAt: now,
    };
    await usersCollection.insertOne(newAuthor);
    author = newAuthor;
    console.log("Created editorial user:", author.id);
  }

  if (!author) throw new Error("Could not create the editorial user");

  // Posts
  const existing = await postsCollection.countDocuments();
  if (existing === 0) {
    const now = new Date();
    const seededPosts: Post[] = [];
    for (const p of SEED_POSTS) {
      seededPosts.push({
        ...p,
        id: await nextId("posts"),
        authorId: author.id,
        excerpt: p.excerpt,
        coverImage: p.coverImage,
        category: p.category,
        createdAt: now,
        updatedAt: now,
      });
    }
    await postsCollection.insertMany(seededPosts);
    console.log(`Inserted ${SEED_POSTS.length} posts`);

    const inserted = await postsCollection.find().toArray();
    const byTitle = new Map(inserted.map((p) => [p.title, p]));
    for (const group of SEED_COMMENTS) {
      for (const c of group) {
        const target = byTitle.get(SEED_POSTS[c.postIndex].title);
        if (target) {
          await commentsCollection.insertOne({
            id: await nextId("comments"),
            postId: target.id,
            authorId: author.id,
            content: c.content,
            createdAt: now,
          });
        }
      }
    }
    console.log("Inserted sample comments");
  } else {
    console.log("Posts already exist, skipping seed.");
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
