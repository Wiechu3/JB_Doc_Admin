export type UserRole = "ADMIN" | "BENEFICIARY";
export type ExpenseStatus = "NOWY" | "ZAAKCEPTOWANO" | "ODRZUCONO";

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
  name: string;
  description: string;
  purchaseAmount: number;
  refundAmount: number;
  status: ExpenseStatus;
  adminComment: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiError = {
  error: string;
};
