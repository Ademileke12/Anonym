// Public cancel endpoint for the hosted checkout page. Allows a shopper to
// bail out of a pending payment before paying on-chain. Only `created` intents
// can be cancelled — once paid, the on-chain deposit already happened.
import { NextResponse } from "next/server";
import { getPublicCheckoutIntent } from "@/services/gateway";
import { createAdminClient } from "@/services/supabase/admin";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid payment id" },
        { status: 400 },
      );
    }

    const current = await getPublicCheckoutIntent(id);
    if (!current.ok || !current.data) {
      return NextResponse.json(
        { ok: false, error: "Payment not found" },
        { status: 404 },
      );
    }
    if (current.data.status !== "created") {
      return NextResponse.json(
        {
          ok: current.data.status === "cancelled",
          data: current.data,
          error:
            current.data.status === "cancelled"
              ? undefined
              : `Payment is ${current.data.status}`,
        },
        { status: 200 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("payment_intents")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "created")
      .select("id, status")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
