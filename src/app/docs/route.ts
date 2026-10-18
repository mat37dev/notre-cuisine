import { reponseDocumentation } from "@/lib/documentation-http";

export async function GET(request: Request) {
  return reponseDocumentation(request);
}
