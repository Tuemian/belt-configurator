import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_inquiries",
  title: "List inquiries",
  description:
    "List customer inquiries sent from the belt conveyor or profile cutting configurator, newest first.",
  inputSchema: {
    tool: z.enum(["belt", "profile"]).describe("Which configurator the inquiries came from."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum number of inquiries."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tool, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const table = tool === "belt" ? "belt_inquiries" : "profile_inquiries";
    const { data, error } = await supabaseForUser(ctx)
      .from(table)
      .select("id, created_at, reference, name, company, email, phone, message, lang, summary_text")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { inquiries: data ?? [] },
    };
  },
});
