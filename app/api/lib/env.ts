import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appSecret: process.env.APP_SECRET || "local-development-secret-change-in-production",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("MONGODB_URI"),
  databaseName: process.env.MONGODB_DATABASE ?? "blogsor",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  ownerEmail: process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b",
};
