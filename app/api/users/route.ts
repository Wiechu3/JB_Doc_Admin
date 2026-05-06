import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ensureBeneficiaryFolders, getUsers, saveUsers, uniqueFolderName } from "@/lib/local-store";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getUsers());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; description?: string };
    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "Nazwa beneficjenta nie moze byc pusta." }, { status: 400 });
    }

    const users = await getUsers();
    const duplicate = users.some(
      (user) => user.role === "BENEFICIARY" && user.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json({ error: "Beneficjent o tej nazwie juz istnieje." }, { status: 409 });
    }

    const folderName = await uniqueFolderName(name);
    await ensureBeneficiaryFolders(folderName);
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      name,
      role: "BENEFICIARY",
      description,
      folderName,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await saveUsers([...users, user]);
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nie udalo sie dodac beneficjenta." }, { status: 500 });
  }
}
