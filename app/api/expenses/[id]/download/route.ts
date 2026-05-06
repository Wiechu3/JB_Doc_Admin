import { NextResponse } from "next/server";
import { getExpenses, readStoredFile } from "@/lib/local-store";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fileType = searchParams.get("type") === "additional" ? "additional" : "invoice";
  const expenses = await getExpenses();
  const expense = expenses.find((item) => item.id === id);

  if (!expense) {
    return NextResponse.json({ error: "Nie znaleziono wydatku." }, { status: 404 });
  }

  const filePath = fileType === "additional" ? expense.additionalFilePath : expense.invoiceFilePath ?? expense.filePath;
  const mimeType = fileType === "additional" ? expense.additionalMimeType : expense.invoiceMimeType ?? expense.mimeType;
  const originalFileName =
    fileType === "additional" ? expense.additionalOriginalFileName : expense.invoiceOriginalFileName ?? expense.originalFileName;

  if (!filePath || !originalFileName) {
    return NextResponse.json({ error: "Brak pliku do pobrania." }, { status: 404 });
  }

  try {
    const file = await readStoredFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(originalFileName)}`
      }
    });
  } catch {
    return NextResponse.json({ error: "Plik nie istnieje na dysku." }, { status: 404 });
  }
}
