import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_configurator_references",
  title: "List configuration references",
  description:
    "List reserved configuration reference IDs (FT-YYYYMMDD-NNN) with their saved configuration and whether a PDF or inquiry followed.",
  inputSchema: {
    tool: z.enum(["belt", "profile"]).optional().describe("Filter by configurator."),
    reference: z.string().trim().min(1).optional().describe("Look up one exact reference ID."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum number of rows."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tool, reference, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("configurator_references")
      .select("reference, tool, lang, configuration, pdf_downloaded_at, inquiry_sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (tool) query = query.eq("tool", tool);
    if (reference) query = query.eq("reference", reference);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { references: data ?? [] },
    };
  },
});
