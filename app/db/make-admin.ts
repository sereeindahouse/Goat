import { getDb } from "../api/queries/connection";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run db:make-admin -- your-email@example.com");
  process.exit(1);
}

const db = await getDb();
const result = await db.collection("users").updateOne(
  { email },
  { $set: { role: "admin", updatedAt: new Date() } },
);

if (result.matchedCount === 0) {
  console.error(`No user found for ${email}. Register the account first.`);
  process.exit(1);
}

console.log(`${email} is now an admin.`);
process.exit(0);