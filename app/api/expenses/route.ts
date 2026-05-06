import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  assertOptionalValidUpload,
  assertValidUpload,
  findBeneficiary,
  getExpenses,
  parsePositiveAmount,
  saveExpenses,
  storeExpenseFile
} from "@/lib/local-store";
import type { Expense } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const beneficiaryId = searchParams.get("beneficiaryId");
  const expenses = await getExpenses();
  const filtered = beneficiaryId ? expenses.filter((expense) => expense.beneficiaryId === beneficiaryId) : expenses;
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const beneficiaryId = String(formData.get("beneficiaryId") ?? "");
    const expenseDate = String(formData.get("expenseDate") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const contractorName = String(formData.get("contractorName") ?? "").trim();
    const contractorNip = String(formData.get("contractorNip") ?? "").trim();
    const purpose = String(formData.get("purpose") ?? "").trim();
    const invoice = formData.get("invoice") instanceof File ? (formData.get("invoice") as File) : null;
    const additional = formData.get("additional") instanceof File ? (formData.get("additional") as File) : null;

    if (!beneficiaryId) {
      return NextResponse.json({ error: "Brak wybranego uzytkownika." }, { status: 400 });
    }

    if (!expenseDate) {
      return NextResponse.json({ error: "Data wydatku jest wymagana." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nazwa wydatku jest wymagana." }, { status: 400 });
    }

    if (!contractorName) {
      return NextResponse.json({ error: "Nazwa kontrahenta jest wymagana." }, { status: 400 });
    }

    if (!contractorNip) {
      return NextResponse.json({ error: "NIP kontrahenta jest wymagany." }, { status: 400 });
    }

    if (purpose !== "PRIORITY" && purpose !== "DETAILED") {
      return NextResponse.json({ error: "Cel wydatku jest wymagany." }, { status: 400 });
    }

    assertValidUpload(invoice);
    const hasAdditional = assertOptionalValidUpload(additional);
    const purchaseAmount = parsePositiveAmount(formData.get("purchaseAmount"), "Kwota zakupu");
    const refundAmount = parsePositiveAmount(formData.get("refundAmount"), "Kwota do zwrotu");
    const beneficiary = await findBeneficiary(beneficiaryId);

    if (!beneficiary) {
      return NextResponse.json({ error: "Nie znaleziono beneficjenta." }, { status: 404 });
    }

    const sharedFileId = randomUUID().slice(0, 8);
    const invoiceMeta = await storeExpenseFile(beneficiary, invoice as File, "invoice", sharedFileId);
    const additionalMeta = hasAdditional && additional ? await storeExpenseFile(beneficiary, additional, "additional", sharedFileId) : null;
    const now = new Date().toISOString();
    const expense: Expense = {
      id: randomUUID(),
      beneficiaryId,
      expenseDate,
      name,
      description,
      contractorName,
      contractorNip,
      purpose,
      purchaseAmount,
      refundAmount,
      status: "NOWY",
      adminComment: "",
      originalFileName: invoiceMeta.originalFileName,
      storedFileName: invoiceMeta.storedFileName,
      filePath: invoiceMeta.filePath,
      mimeType: invoiceMeta.mimeType,
      fileSize: invoiceMeta.fileSize,
      invoiceOriginalFileName: invoiceMeta.originalFileName,
      invoiceStoredFileName: invoiceMeta.storedFileName,
      invoiceFilePath: invoiceMeta.filePath,
      invoiceMimeType: invoiceMeta.mimeType,
      invoiceFileSize: invoiceMeta.fileSize,
      additionalOriginalFileName: additionalMeta?.originalFileName,
      additionalStoredFileName: additionalMeta?.storedFileName,
      additionalFilePath: additionalMeta?.filePath,
      additionalMimeType: additionalMeta?.mimeType,
      additionalFileSize: additionalMeta?.fileSize,
      createdAt: now,
      updatedAt: now
    };

    const expenses = await getExpenses();
    await saveExpenses([...expenses, expense]);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udalo sie zapisac wydatku." },
      { status: 400 }
    );
  }
}
