import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Deletes rooms past their expires_at. Players/questions/answers cascade.
 * Intended to be hit by Vercel Cron (see vercel.json) so the DB doesn't
 * accumulate abandoned rooms from a small, informal friend-group game.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
