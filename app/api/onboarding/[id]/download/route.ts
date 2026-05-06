import { NextResponse } from "next/server";
import { getOnboardingDocuments, readStoredFile } from "@/lib/local-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documents = await getOnboardingDocuments();
  const document = documents.find((item) => item.id === id);

  if (!document) {
    return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
  }

  try {
    const file = await readStoredFile(document.filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`
      }
    });
  } catch {
    return NextResponse.json({ error: "Plik nie istnieje na dysku." }, { status: 404 });
  }
}
