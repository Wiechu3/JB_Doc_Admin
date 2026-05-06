import { NextResponse } from "next/server";
import { updateExpenseStatus } from "@/lib/local-store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await updateExpenseStatus(id, "ODRZUCONO");
  if (!expense) {
    return NextResponse.json({ error: "Nie znaleziono wydatku." }, { status: 404 });
  }
  return NextResponse.json(expense);
}
