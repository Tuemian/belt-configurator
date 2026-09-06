import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const BASE_URL = "https://konfigurator.novamotis.com/belt-conveyor";

const configSchema = {
  frameWidth: z.number().min(100).max(2000).default(400).describe("Frame width in mm."),
  beltLength: z.number().min(500).max(12000).default(2000).describe("Belt length in mm."),
  sideGuideHeight: z.number().min(0).max(300).default(30).describe("Side guide height in mm."),
  inclineAngle: z.number().min(-10).max(10).default(0).describe("Incline angle in degrees."),
  beltType: z.enum(["standard", "grip", "heavy-grip", "food-safe"]).default("standard"),
  speed: z.number().min(1).max(120).default(15).describe("Belt speed in m/min."),
  loadCapacity: z.number().min(1).max(500).default(50).describe("Load in kg."),
  driveType: z.enum(["direct", "indirect", "center", "drum"]).default("direct"),
  motorPosition: z.enum(["left", "right"]).default("left"),
  motorAngle: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
  centerDriveOffset: z.number().min(0).max(6000).default(0).describe("Center drive offset in mm."),
  withStand: z.boolean().default(true),
  standHeight: z.number().min(300).max(2000).default(800).describe("Stand height in mm."),
  floorElement: z.enum(["feet", "castors"]).default("feet"),
  heightAdjust: z.boolean().default(false),
  floorBolts: z.boolean().default(false),
};

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default defineTool({
  name: "build_conveyor_link",
  title: "Build belt conveyor link",
  description:
    "Turn a belt conveyor specification into a shareable link that opens the configurator with that setup preloaded.",
  inputSchema: {
    ...configSchema,
    step: z.number().int().min(1).max(5).default(5).describe("Wizard step to open (1-5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ step, ...config }) => {
    const url = new URL(BASE_URL);
    url.searchParams.set("cfg", toBase64Url(JSON.stringify(config)));
    url.searchParams.set("step", String(step ?? 5));
    const link = url.toString();
    return {
      content: [{ type: "text", text: link }],
      structuredContent: { url: link, config },
    };
  },
});
