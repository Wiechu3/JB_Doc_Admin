import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Expense, ExpenseStatus, OnboardingDocument, User } from "@/lib/types";

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

const dataDir = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const storageDir = path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "documents");
const usersPath = path.join(dataDir, "users.json");
const expensesPath = path.join(dataDir, "expenses.json");
const onboardingDocumentsPath = path.join(dataDir, "onboardingDocuments.json");

const adminUser: User = {
  id: "admin",
  name: "ADMIN",
  role: "ADMIN",
  description: "",
  folderName: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function ensureBaseFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(storageDir, { recursive: true });

  try {
    await fs.access(usersPath);
  } catch {
    await fs.writeFile(usersPath, JSON.stringify([adminUser], null, 2));
  }

  try {
    await fs.access(expensesPath);
  } catch {
    await fs.writeFile(expensesPath, JSON.stringify([], null, 2));
  }

  try {
    await fs.access(onboardingDocumentsPath);
  } catch {
    await fs.writeFile(onboardingDocumentsPath, JSON.stringify([], null, 2));
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  await ensureBaseFiles();
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

async function writeJson<T>(filePath: string, data: T) {
  await ensureBaseFiles();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function getUsers() {
  const users = await readJson<User[]>(usersPath, [adminUser]);
  if (!users.some((user) => user.id === "admin")) {
    const now = new Date().toISOString();
    const fixedAdmin = { ...adminUser, createdAt: now, updatedAt: now };
    const nextUsers = [fixedAdmin, ...users];
    await writeJson(usersPath, nextUsers);
    return nextUsers;
  }
  return users;
}

export async function saveUsers(users: User[]) {
  await writeJson(usersPath, users);
}

export async function getExpenses() {
  return readJson<Expense[]>(expensesPath, []);
}

export async function saveExpenses(expenses: Expense[]) {
  await writeJson(expensesPath, expenses);
}

export async function getOnboardingDocuments() {
  return readJson<OnboardingDocument[]>(onboardingDocumentsPath, []);
}

export async function saveOnboardingDocuments(documents: OnboardingDocument[]) {
  await writeJson(onboardingDocumentsPath, documents);
}

export function slugifyFolderName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || `beneficjent_${randomUUID().slice(0, 8)}`;
}

export async function uniqueFolderName(baseName: string) {
  const users = await getUsers();
  const existing = new Set(users.map((user) => user.folderName).filter(Boolean));
  let candidate = slugifyFolderName(baseName);
  let index = 2;

  while (existing.has(candidate)) {
    candidate = `${slugifyFolderName(baseName)}_${index}`;
    index += 1;
  }

  return candidate;
}

export async function ensureBeneficiaryFolders(folderName: string) {
  await fs.mkdir(path.join(storageDir, folderName, "wydatki"), { recursive: true });
}

export async function ensureOnboardingFolder(folderName: string) {
  await fs.mkdir(path.join(storageDir, folderName, "onboarding"), { recursive: true });
}

export async function findBeneficiary(id: string) {
  const users = await getUsers();
  return users.find((user) => user.id === id && user.role === "BENEFICIARY");
}

export function parsePositiveAmount(value: FormDataEntryValue | null, fieldName: string) {
  const amountText = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
    throw new Error(`${fieldName}: podaj kwote w PLN z maksymalnie dwoma miejscami po przecinku.`);
  }

  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName}: kwota musi byc wieksza od zera.`);
  }

  return Math.round(amount * 100) / 100;
}

export function assertValidUpload(file: File | null) {
  if (!file || file.size === 0) {
    throw new Error("Plik jest wymagany.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Plik nie moze przekraczac 25 MB.");
  }
}

export function assertOptionalValidUpload(file: File | null) {
  if (!file || file.size === 0) {
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Plik nie moze przekraczac 25 MB.");
  }

  return true;
}

export function safeStoredFileName(kind: "expense" | "invoice" | "additional" | "onboarding", originalFileName: string, sharedId?: string) {
  const extension = path.extname(originalFileName);
  const base = path
    .basename(originalFileName, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "plik";
  const date = new Date().toISOString().slice(0, 10);
  return `${date}_${kind}_${sharedId ?? randomUUID().slice(0, 8)}_${base}${extension.toLowerCase()}`;
}

async function storeBeneficiaryFile(beneficiary: User, subfolder: "wydatki" | "onboarding", kind: "invoice" | "additional" | "onboarding", file: File, sharedId?: string) {
  if (!beneficiary.folderName) {
    throw new Error("Beneficjent nie ma folderu dokumentow.");
  }

  if (subfolder === "onboarding") {
    await ensureOnboardingFolder(beneficiary.folderName);
  } else {
    await ensureBeneficiaryFolders(beneficiary.folderName);
  }

  const storedFileName = safeStoredFileName(kind, file.name, sharedId);
  const relativePath = path.join("storage", "documents", beneficiary.folderName, subfolder, storedFileName);
  const absolutePath = path.join(storageDir, beneficiary.folderName, subfolder, storedFileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    originalFileName: file.name,
    storedFileName,
    filePath: relativePath,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size
  };
}

export async function storeExpenseFile(beneficiary: User, file: File, kind: "invoice" | "additional", sharedId: string) {
  return storeBeneficiaryFile(beneficiary, "wydatki", kind, file, sharedId);
}

export async function storeOnboardingFile(beneficiary: User, file: File) {
  return storeBeneficiaryFile(beneficiary, "onboarding", "onboarding", file);
}

export async function readStoredFile(relativePath: string) {
  const absolutePath = path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  const resolved = path.resolve(absolutePath);
  const allowedRoot = path.resolve(storageDir);

  if (!resolved.startsWith(allowedRoot)) {
    throw new Error("Nieprawidlowa sciezka pliku.");
  }

  return fs.readFile(resolved);
}

export async function updateExpenseStatus(id: string, status: ExpenseStatus) {
  const expenses = await getExpenses();
  const expense = expenses.find((item) => item.id === id);

  if (!expense) {
    return null;
  }

  expense.status = status;
  expense.updatedAt = new Date().toISOString();
  await saveExpenses(expenses);
  return expense;
}
