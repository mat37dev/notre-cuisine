import { originOf } from "@/lib/http";
import { instructionsClaude } from "@/lib/recipe/prompts";

export async function GET(request: Request) {
  return new Response(instructionsClaude(originOf(request)), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
