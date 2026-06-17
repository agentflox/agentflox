import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Dynamic import to ensure process.env is populated first
const { openai } = await import("./lib/openai.js");

async function run() {
  console.log("Testing OpenAI API Key:", process.env.OPENAI_API_KEY ? "Present (ends in " + process.env.OPENAI_API_KEY.slice(-8) + ")" : "Missing");
  console.log("Testing Base URL:", process.env.OPENAI_BASE_URL || "https://api.openai.com/v1");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello in JSON format" }],
      response_format: { type: "json_object" }
    });
    console.log("SUCCESS:", JSON.stringify(response, null, 2));
  } catch (err: any) {
    console.error("FAILED WITH ERROR:", err);
  }
}

run();
