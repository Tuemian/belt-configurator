import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pricing_components",
  title: "List pricing components",
  description:
    "List the priced components of a configurator (key, labels, unit, price in EUR, article number, price source). Requires an account with pricing access.",
  inputSchema: {
    tool: z.enum(["belt", "profile"]).default("belt").describe("Which configurator's price list."),
    includeInactive: z.boolean().default(false).describe("Also return deactivated components."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tool, includeInactive }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("pricing_components")
      .select("key, tool, label_de, label_en, unit, price_eur, active, article_number, price_source, erp_synced_at")
      .eq("tool", tool ?? "belt")
      .order("key", { ascending: true });
    if (!includeInactive) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data || data.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No pricing components visible for this account. Pricing data requires an admin account.",
        }],
        structuredContent: { components: [] },
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { components: data },
    };
  },
});
