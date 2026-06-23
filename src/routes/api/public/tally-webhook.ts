import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { upsertTallySubmission, type TallyFieldLike } from "@/lib/tally.functions";

export const Route = createFileRoute("/api/public/tally-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.TALLY_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 503 });
        }

        const signature = request.headers.get("tally-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("base64");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          eventId?: string;
          data?: {
            responseId?: string;
            submissionId?: string;
            formId?: string;
            createdAt?: string;
            fields?: TallyFieldLike[];
          };
        };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const formId = payload.data?.formId;
        const submissionId = payload.data?.submissionId ?? payload.data?.responseId;
        if (!formId || !submissionId) {
          return new Response("Missing formId/submissionId", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: quest } = await supabaseAdmin
          .from("quests")
          .select("id")
          .eq("tally_form_id", formId)
          .maybeSingle();
        if (!quest) {
          return new Response("No quest configured for this form", { status: 404 });
        }

        try {
          await upsertTallySubmission(supabaseAdmin, quest.id, {
            submissionId,
            responseId: payload.data?.responseId,
            submittedAt: payload.data?.createdAt,
            fields: payload.data?.fields ?? [],
            raw: payload,
          });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Failed", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
