import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
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
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const file = formData.get("file") instanceof File ? (formData.get("file") as File) : null;

    if (!beneficiaryId) {
      return NextResponse.json({ error: "Brak wybranego uzytkownika." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Nazwa wydatku jest wymagana." }, { status: 400 });
    }

    assertValidUpload(file);
    const purchaseAmount = parsePositiveAmount(formData.get("purchaseAmount"), "Kwota zakupu");
    const refundAmount = parsePositiveAmount(formData.get("refundAmount"), "Kwota do zwrotu");
    const beneficiary = await findBeneficiary(beneficiaryId);

    if (!beneficiary) {
      return NextResponse.json({ error: "Nie znaleziono beneficjenta." }, { status: 404 });
    }

    const fileMeta = await storeExpenseFile(beneficiary, file as File);
    const now = new Date().toISOString();
    const expense: Expense = {
      id: randomUUID(),
      beneficiaryId,
      name,
      description,
      purchaseAmount,
      refundAmount,
      status: "NOWY",
      adminComment: "",
      ...fileMeta,
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
