import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

export function getApiKey(): string {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    console.log(
      JSON.stringify({
        ok: false,
        error: "Missing SERPER_API_KEY in .env",
        code: "CONFIG",
      })
    );
    process.exit(1);
  }
  return key;
}
