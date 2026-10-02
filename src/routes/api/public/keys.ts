import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// External key-issuing endpoint. Call with header: Authorization: Bearer <KEYS_API_TOKEN>
// Body: { "duration": "24h|7d|1m|3m|6m|9m|1y|perm", "count": 1, "note": "optional" }
const schema = z.object({
  duration: z.enum(["24h", "7d", "1m", "3m", "6m", "9m", "1y", "perm"]),
  count: z.number().int().min(1).max(100).default(1),
  note: z.string().max(80).optional(),
});

export const Route = createFileRoute("/api/public/keys")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { safeEqual, createKeys } = await import("@/lib/keys.server");
        const expected = process.env["KEYS_API_TOKEN"];
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!expected || !token || !safeEqual(token, expected)) return new Response("Unauthorized", { status: 401 });
        let body: unknown;
        try { body = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
        const keys = await createKeys(parsed.data.duration, parsed.data.count, parsed.data.note);
        return Response.json({ keys });
      },
    },
  },
});
