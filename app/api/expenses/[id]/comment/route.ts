import { NextResponse } from "next/server";
import { getExpenses, saveExpenses } from "@/lib/local-store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { adminComment?: string };
  const expenses = await getExpenses();
  const expense = expenses.find((item) => item.id === id);

  if (!expense) {
    return NextResponse.json({ error: "Nie znaleziono wydatku." }, { status: 404 });
  }

  expense.adminComment = body.adminComment?.trim() ?? "";
  expense.updatedAt = new Date().toISOString();
  await saveExpenses(expenses);
  return NextResponse.json(expense);
}
