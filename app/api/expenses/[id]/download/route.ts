import { NextResponse } from "next/server";
import { getExpenses, readStoredFile } from "@/lib/local-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expenses = await getExpenses();
  const expense = expenses.find((item) => item.id === id);

  if (!expense) {
    return NextResponse.json({ error: "Nie znaleziono wydatku." }, { status: 404 });
  }

  try {
    const file = await readStoredFile(expense.filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": expense.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(expense.originalFileName)}`
      }
    });
  } catch {
    return NextResponse.json({ error: "Plik nie istnieje na dysku." }, { status: 404 });
  }
}
