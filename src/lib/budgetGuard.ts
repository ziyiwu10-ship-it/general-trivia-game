import { supabaseServer } from "@/lib/supabase/server";

const DAILY_CAP = Number(process.env.MAX_DAILY_CLAUDE_REQUESTS ?? 20);

/**
 * Atomically checks and increments today's Claude request count.
 * Throws if the daily cap has been reached.
 */
export async function consumeBudgetOrThrow(): Promise<void> {
  const supabase = supabaseServer();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("api_usage")
    .select("request_count")
    .eq("usage_date", today)
    .maybeSingle();

  const count = existing?.request_count ?? 0;
  if (count >= DAILY_CAP) {
    throw new Error(
      `Daily Claude API budget of ${DAILY_CAP} requests reached. Try again tomorrow.`
    );
  }

  await supabase
    .from("api_usage")
    .upsert({ usage_date: today, request_count: count + 1 }, { onConflict: "usage_date" });
}
