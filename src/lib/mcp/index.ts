import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listInquiriesTool from "./tools/list-inquiries";
import listConfiguratorReferencesTool from "./tools/list-configurator-references";
import listPricingComponentsTool from "./tools/list-pricing-components";
import buildConveyorLinkTool from "./tools/build-conveyor-link";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "configurator",
  title: "Configurator",
  version: "0.1.0",
  instructions:
    "Tools for the NOVAMOTIS Configurator. Use `list_inquiries` for customer inquiries, `list_configurator_references` to look up reference IDs and their saved configuration, `list_pricing_components` for the price list, and `build_conveyor_link` to create a shareable belt conveyor configuration link.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listInquiriesTool,
    listConfiguratorReferencesTool,
    listPricingComponentsTool,
    buildConveyorLinkTool,
  ],
});
