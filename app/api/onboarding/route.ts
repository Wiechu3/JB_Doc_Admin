import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  assertValidUpload,
  findBeneficiary,
  getOnboardingDocuments,
  saveOnboardingDocuments,
  storeOnboardingFile
} from "@/lib/local-store";
import type { OnboardingDocument } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const beneficiaryId = searchParams.get("beneficiaryId");
  const documents = await getOnboardingDocuments();
  const filtered = beneficiaryId ? documents.filter((document) => document.beneficiaryId === beneficiaryId) : documents;
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const beneficiaryId = String(formData.get("beneficiaryId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const file = formData.get("file") instanceof File ? (formData.get("file") as File) : null;

    if (!beneficiaryId) {
      return NextResponse.json({ error: "Brak wybranego beneficjenta." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nazwa dokumentu jest wymagana." }, { status: 400 });
    }

    assertValidUpload(file);
    const beneficiary = await findBeneficiary(beneficiaryId);

    if (!beneficiary) {
      return NextResponse.json({ error: "Nie znaleziono beneficjenta." }, { status: 404 });
    }

    const fileMeta = await storeOnboardingFile(beneficiary, file as File);
    const document: OnboardingDocument = {
      id: randomUUID(),
      beneficiaryId,
      name,
      originalFileName: fileMeta.originalFileName,
      storedFileName: fileMeta.storedFileName,
      filePath: fileMeta.filePath,
      mimeType: fileMeta.mimeType,
      fileSize: fileMeta.fileSize,
      createdAt: new Date().toISOString()
    };

    const documents = await getOnboardingDocuments();
    await saveOnboardingDocuments([...documents, document]);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udalo sie wyslac dokumentu onboardingowego." },
      { status: 400 }
    );
  }
}
