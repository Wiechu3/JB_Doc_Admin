export type UserRole = "ADMIN" | "BENEFICIARY";
export type ExpenseStatus = "NOWY" | "ZAAKCEPTOWANO" | "ODRZUCONO";
export type ExpensePurpose = "PRIORITY" | "DETAILED";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  description: string;
  folderName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  beneficiaryId: string;
  expenseDate?: string;
  name: string;
  description: string;
  contractorName?: string;
  contractorNip?: string;
  purpose?: ExpensePurpose;
  purchaseAmount: number;
  refundAmount: number;
  status: ExpenseStatus;
  adminComment: string;
  originalFileName?: string;
  storedFileName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  invoiceOriginalFileName?: string;
  invoiceStoredFileName?: string;
  invoiceFilePath?: string;
  invoiceMimeType?: string;
  invoiceFileSize?: number;
  additionalOriginalFileName?: string;
  additionalStoredFileName?: string;
  additionalFilePath?: string;
  additionalMimeType?: string;
  additionalFileSize?: number;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingDocument = {
  id: string;
  beneficiaryId: string;
  name: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type ApiError = {
  error: string;
};
