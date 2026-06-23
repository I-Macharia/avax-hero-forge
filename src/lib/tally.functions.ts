import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Shared helper used by both the webhook and the on-demand sync.
// Extracts (email, name, wallet) from a Tally submission payload (best-effort).
export type TallyFieldLike = { key?: string; label?: string; value?: unknown };

function pickField(fields: TallyFieldLike[], needles: string[]): string | null {
  const norm = (s: string | undefined) => (s ?? "").toLowerCase();
  for (const f of fields) {
    const label = norm(f.label) + " " + norm(f.key);
    if (needles.some((n) => label.includes(n))) {
      if (typeof f.value === "string") return f.value;
      if (Array.isArray(f.value) && typeof f.value[0] === "string") return f.value[0] as string;
    }
  }
  return null;
}

export async function upsertTallySubmission(
  supabaseAdmin: any,
  questId: string,
  submission: {
    submissionId: string;
    responseId?: string;
    submittedAt?: string;
    fields: TallyFieldLike[];
    raw: unknown;
  },
) {
  const email = pickField(submission.fields, ["email"]);
  const name = pickField(submission.fields, ["name", "full name", "your name"]);
  const wallet = pickField(submission.fields, ["wallet", "address", "0x"]);

  let matchedUserId: string | null = null;
  if (email) {
    const { data: userByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("display_name", email.split("@")[0])
      .maybeSingle();
    matchedUserId = userByEmail?.id ?? null;
  }
  if (!matchedUserId && wallet) {
    const { data: userByWallet } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("wallet_address", wallet)
      .maybeSingle();
    matchedUserId = userByWallet?.id ?? null;
  }

  const { error } = await supabaseAdmin.from("quest_submissions").upsert(
    {
      quest_id: questId,
      tally_submission_id: submission.submissionId,
      tally_response_id: submission.responseId ?? null,
      respondent_email: email,
      respondent_name: name,
      respondent_wallet: wallet,
      matched_user_id: matchedUserId,
      raw_payload: submission.raw as object,
      submitted_at: submission.submittedAt ?? new Date().toISOString(),
    },
    { onConflict: "tally_submission_id" },
  );
  if (error) throw new Error(`upsert failed: ${error.message}`);

  // Auto-create a quest_completion when matched and quest is auto_approve
  if (matchedUserId) {
    const { data: quest } = await supabaseAdmin
      .from("quests")
      .select("auto_approve")
      .eq("id", questId)
      .maybeSingle();
    if (quest?.auto_approve) {
      await supabaseAdmin
        .from("quest_completions")
        .upsert(
          { user_id: matchedUserId, quest_id: questId },
          { onConflict: "user_id,quest_id", ignoreDuplicates: true },
        );
    }
  }
}

// -- On-demand resync from Tally REST API --
const syncInput = z.object({ questId: z.string().uuid() });

export const resyncTallyQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => syncInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isAdmin }, { data: isOrg }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "organizer" }),
    ]);
    if (!isAdmin && !isOrg) throw new Error("Forbidden");

    const apiKey = process.env.TALLY_API_KEY;
    if (!apiKey) throw new Error("TALLY_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quest } = await supabaseAdmin
      .from("quests")
      .select("id, tally_form_id")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest?.tally_form_id) throw new Error("Quest has no Tally form configured");

    let page = 1;
    let total = 0;
    // Tally REST: GET /forms/{formId}/submissions?page=1
    for (;;) {
      const res = await fetch(
        `https://api.tally.so/forms/${quest.tally_form_id}/submissions?page=${page}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!res.ok) throw new Error(`Tally API error: ${res.status}`);
      const json = (await res.json()) as {
        submissions?: Array<{
          id: string;
          responseId?: string;
          submittedAt?: string;
          responses?: TallyFieldLike[];
        }>;
        page?: number;
        totalPages?: number;
      };
      const list = json.submissions ?? [];
      for (const s of list) {
        await upsertTallySubmission(supabaseAdmin, quest.id, {
          submissionId: s.id,
          responseId: s.responseId,
          submittedAt: s.submittedAt,
          fields: s.responses ?? [],
          raw: s,
        });
        total += 1;
      }
      if (!json.totalPages || page >= json.totalPages || list.length === 0) break;
      page += 1;
    }
    return { ok: true as const, total };
  });
