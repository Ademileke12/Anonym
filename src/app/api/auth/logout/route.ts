import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
