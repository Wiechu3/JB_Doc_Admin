"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, FileText, MessageSquare, Plus, RefreshCw, Send, X } from "lucide-react";
import type { ApiError, Expense, ExpensePurpose, ExpenseStatus, OnboardingDocument, User } from "@/lib/types";

type Tab = "expenses" | "onboarding" | "settings";
type OnboardingSection = "welcome" | "marketing" | "contact" | "documents";

const currencyFormatter = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short" });

function statusClass(status: ExpenseStatus) {
  if (status === "ZAAKCEPTOWANO") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (status === "ODRZUCONO") return "bg-red-100 text-red-700 ring-red-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function purposeLabel(purpose?: ExpensePurpose) {
  if (purpose === "PRIORITY") return "Priorytetowy";
  if (purpose === "DETAILED") return "Szczegółowy";
  return "Brak danych";
}

function fileSizeLabel(size?: number) {
  if (!size) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : "Brak danych";
}

function displayExpenseDate(value?: string) {
  if (!value) return "Brak danych";
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function invoiceName(expense: Expense) {
  return expense.invoiceOriginalFileName ?? expense.originalFileName;
}

function invoiceSize(expense: Expense) {
  return expense.invoiceFileSize ?? expense.fileSize;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const apiError = data && typeof data === "object" && "error" in data ? (data as ApiError).error : "Wystąpił błąd aplikacji.";
    throw new Error(apiError);
  }
  return data as T;
}

export function DocHelperApp() {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [onboardingDocuments, setOnboardingDocuments] = useState<OnboardingDocument[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("admin");
  const [adminBeneficiaryId, setAdminBeneficiaryId] = useState("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState<"all" | ExpenseStatus>("all");
  const [adminPurposeFilter, setAdminPurposeFilter] = useState<"all" | ExpensePurpose>("all");
  const [adminDateFrom, setAdminDateFrom] = useState("");
  const [adminDateTo, setAdminDateTo] = useState("");
  const [onboardingSection, setOnboardingSection] = useState<OnboardingSection>("welcome");
  const [onboardingBeneficiaryFilter, setOnboardingBeneficiaryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const currentUser = users.find((user) => user.id === selectedUserId);
  const isAdmin = currentUser?.role === "ADMIN";
  const beneficiaries = users.filter((user) => user.role === "BENEFICIARY");
  const activeUsers = users.filter((user) => user.role === "ADMIN" || user.isActive);

  const visibleExpenses = useMemo(() => {
    if (!isAdmin) {
      return currentUser ? expenses.filter((expense) => expense.beneficiaryId === currentUser.id) : [];
    }

    return expenses.filter((expense) => {
      if (adminBeneficiaryId !== "all" && expense.beneficiaryId !== adminBeneficiaryId) return false;
      if (adminStatusFilter !== "all" && expense.status !== adminStatusFilter) return false;
      if (adminPurposeFilter !== "all" && expense.purpose !== adminPurposeFilter) return false;
      if (adminDateFrom && (!expense.expenseDate || expense.expenseDate < adminDateFrom)) return false;
      if (adminDateTo && (!expense.expenseDate || expense.expenseDate > adminDateTo)) return false;
      return true;
    });
  }, [adminBeneficiaryId, adminDateFrom, adminDateTo, adminPurposeFilter, adminStatusFilter, currentUser, expenses, isAdmin]);

  const visibleOnboardingDocuments = useMemo(() => {
    if (!isAdmin) {
      return currentUser ? onboardingDocuments.filter((document) => document.beneficiaryId === currentUser.id) : [];
    }

    return onboardingBeneficiaryFilter === "all"
      ? onboardingDocuments
      : onboardingDocuments.filter((document) => document.beneficiaryId === onboardingBeneficiaryFilter);
  }, [currentUser, isAdmin, onboardingBeneficiaryFilter, onboardingDocuments]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [usersResponse, expensesResponse, onboardingResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/expenses"),
        fetch("/api/onboarding")
      ]);
      const [nextUsers, nextExpenses, nextOnboardingDocuments] = await Promise.all([
        parseResponse<User[]>(usersResponse),
        parseResponse<Expense[]>(expensesResponse),
        parseResponse<OnboardingDocument[]>(onboardingResponse)
      ]);

      setUsers(nextUsers);
      setExpenses(nextExpenses);
      setOnboardingDocuments(nextOnboardingDocuments);
      setSelectedUserId((previousUserId) =>
        nextUsers.some((user) => user.id === previousUserId && (user.role === "ADMIN" || user.isActive)) ? previousUserId : "admin"
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nie udało się odświeżyć danych.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!isAdmin && activeTab === "settings") setActiveTab("expenses");
  }, [activeTab, isAdmin]);

  function showNotice(message: string) {
    setNotice(message);
    setError("");
  }

  function showError(message: string) {
    setError(message);
    setNotice("");
  }

  async function handleAddBeneficiary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      showError("Nazwa beneficjenta nie może być pusta.");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: String(formData.get("description") ?? "").trim() })
      });
      await parseResponse<User>(response);
      form.reset();
      showNotice("Beneficjent został dodany, a folder wydatków utworzony.");
      await refreshData();
    } catch (caughtError) {
      showError(caughtError instanceof Error ? caughtError.message : "Nie udało się dodać beneficjenta.");
    }
  }

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || currentUser.role !== "BENEFICIARY") {
      showError("Brak wybranego beneficjenta.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const invoice = formData.get("invoice") as File | null;
    const additional = formData.get("additional") as File | null;
    const requiredFields = [
      ["expenseDate", "Data wydatku jest wymagana."],
      ["name", "Nazwa wydatku jest wymagana."],
      ["contractorName", "Nazwa kontrahenta jest wymagana."],
      ["contractorNip", "NIP kontrahenta jest wymagany."],
      ["purpose", "Cel wydatku jest wymagany."]
    ] as const;

    for (const [field, message] of requiredFields) {
      if (!String(formData.get(field) ?? "").trim()) {
        showError(message);
        return;
      }
    }

    const purchaseAmount = Number(String(formData.get("purchaseAmount") ?? "").replace(",", "."));
    const refundAmount = Number(String(formData.get("refundAmount") ?? "").replace(",", "."));
    if (!purchaseAmount || purchaseAmount <= 0 || !refundAmount || refundAmount <= 0) {
      showError("Kwoty muszą być większe od zera.");
      return;
    }
    if (!invoice || invoice.size === 0) {
      showError("Faktura jest wymagana.");
      return;
    }
    if (invoice.size > 25 * 1024 * 1024 || (additional && additional.size > 25 * 1024 * 1024)) {
      showError("Pojedynczy plik nie może przekraczać 25 MB.");
      return;
    }

    formData.set("beneficiaryId", currentUser.id);

    try {
      const response = await fetch("/api/expenses", { method: "POST", body: formData });
      await parseResponse<Expense>(response);
      form.reset();
      setIsExpenseFormOpen(false);
      showNotice("Wydatek został zapisany.");
      await refreshData();
    } catch (caughtError) {
      showError(caughtError instanceof Error ? caughtError.message : "Nie udało się zapisać wydatku.");
    }
  }

  async function handleStatus(expenseId: string, action: "approve" | "reject") {
    try {
      const response = await fetch(`/api/expenses/${expenseId}/${action}`, { method: "POST" });
      await parseResponse<Expense>(response);
      showNotice(action === "approve" ? "Wydatek został zatwierdzony." : "Wydatek został odrzucony.");
      await refreshData();
    } catch (caughtError) {
      showError(caughtError instanceof Error ? caughtError.message : "Nie udało się zmienić statusu.");
    }
  }

  async function handleComment(expenseId: string) {
    try {
      const response = await fetch(`/api/expenses/${expenseId}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminComment: commentDrafts[expenseId] ?? "" })
      });
      await parseResponse<Expense>(response);
      showNotice("Komentarz ADMINA został zapisany.");
      await refreshData();
    } catch (caughtError) {
      showError(caughtError instanceof Error ? caughtError.message : "Nie udało się zapisać komentarza.");
    }
  }

  async function handleUploadOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || currentUser.role !== "BENEFICIARY") {
      showError("Dokument może wysłać wybrany beneficjent.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!name) {
      showError("Nazwa dokumentu jest wymagana.");
      return;
    }
    if (!file || file.size === 0) {
      showError("Plik jest wymagany.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showError("Plik nie może przekraczać 25 MB.");
      return;
    }

    formData.set("beneficiaryId", currentUser.id);

    try {
      const response = await fetch("/api/onboarding", { method: "POST", body: formData });
      await parseResponse<OnboardingDocument>(response);
      form.reset();
      showNotice("Dokument onboardingowy został wysłany.");
      await refreshData();
    } catch (caughtError) {
      showError(caughtError instanceof Error ? caughtError.message : "Nie udało się wysłać dokumentu.");
    }
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[linear-gradient(180deg,#fff7ed_0,#f8fafc_260px)]">
      <header className="w-full max-w-full border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-600 text-white shadow-soft">
              <FileText size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">DocHelper</h1>
              <p className="text-sm text-slate-500">Lokalna obsługa beneficjentów, wydatków i onboardingu</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap gap-2">
              <TabButton active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")}>WYDATKI</TabButton>
              <TabButton active={activeTab === "onboarding"} onClick={() => setActiveTab("onboarding")}>DOKUMENTY ONBOARDING</TabButton>
              {isAdmin ? <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>USTAWIENIA</TabButton> : null}
            </nav>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="font-medium text-slate-600">Użytkownik:</span>
              <select className="bg-transparent font-semibold text-slate-900 outline-none" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                {activeUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">{isAdmin ? "Panel funduszu" : "Panel beneficjenta"}</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-950">{activeTab === "expenses" ? "Wydatki" : activeTab === "settings" ? "Ustawienia" : "Dokumenty onboarding"}</h2>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50" onClick={refreshData} type="button">
            <RefreshCw size={16} />
            Odśwież dane
          </button>
        </div>

        {notice ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}
        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500 shadow-soft">Ładowanie danych...</div>
        ) : activeTab === "settings" && isAdmin ? (
          <SettingsView beneficiaries={beneficiaries} onAddBeneficiary={handleAddBeneficiary} />
        ) : activeTab === "onboarding" ? (
          <OnboardingView
            beneficiaries={beneficiaries}
            currentUser={currentUser}
            documents={visibleOnboardingDocuments}
            isAdmin={Boolean(isAdmin)}
            selectedBeneficiaryId={onboardingBeneficiaryFilter}
            section={onboardingSection}
            users={users}
            onBeneficiaryChange={setOnboardingBeneficiaryFilter}
            onSectionChange={setOnboardingSection}
            onUpload={handleUploadOnboarding}
          />
        ) : isAdmin ? (
          <AdminExpensesView
            beneficiaries={beneficiaries}
            commentDrafts={commentDrafts}
            dateFrom={adminDateFrom}
            dateTo={adminDateTo}
            expenses={visibleExpenses}
            purposeFilter={adminPurposeFilter}
            selectedBeneficiaryId={adminBeneficiaryId}
            statusFilter={adminStatusFilter}
            users={users}
            onBeneficiaryChange={setAdminBeneficiaryId}
            onCommentDraftChange={(expenseId, value) => setCommentDrafts((drafts) => ({ ...drafts, [expenseId]: value }))}
            onCommentSave={handleComment}
            onDateFromChange={setAdminDateFrom}
            onDateToChange={setAdminDateTo}
            onPurposeFilterChange={setAdminPurposeFilter}
            onStatus={handleStatus}
            onStatusFilterChange={setAdminStatusFilter}
          />
        ) : (
          <BeneficiaryExpensesView
            currentUser={currentUser}
            expenses={visibleExpenses}
            isFormOpen={isExpenseFormOpen}
            onAddExpense={handleAddExpense}
            onFormOpenChange={setIsExpenseFormOpen}
          />
        )}
      </section>
    </main>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button className={`rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-orange-600 text-white shadow-sm" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function SettingsView({ beneficiaries, onAddBeneficiary }: { beneficiaries: User[]; onAddBeneficiary: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft" onSubmit={onAddBeneficiary}>
        <h3 className="text-lg font-bold text-slate-950">Dodaj beneficjenta</h3>
        <div className="mt-4 space-y-4">
          <Field label="Nazwa beneficjenta" name="name" required />
          <Field label="Opis beneficjenta" name="description" textarea />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-700" type="submit">
            <Plus size={18} />
            Dodaj beneficjenta
          </button>
        </div>
      </form>
      <Panel title="Lista beneficjentów">
        <TableShell empty={beneficiaries.length === 0 ? "Brak beneficjentów do wyświetlenia." : ""}>
          {beneficiaries.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Nazwa</th><th className="px-4 py-3">Opis</th><th className="px-4 py-3">Folder</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{beneficiary.name}</td>
                    <td className="px-4 py-3 text-slate-600">{beneficiary.description || "Brak opisu"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{beneficiary.folderName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TableShell>
      </Panel>
    </div>
  );
}

function BeneficiaryExpensesView({
  currentUser,
  expenses,
  isFormOpen,
  onAddExpense,
  onFormOpenChange
}: {
  currentUser: User | undefined;
  expenses: Expense[];
  isFormOpen: boolean;
  onAddExpense: (event: FormEvent<HTMLFormElement>) => void;
  onFormOpenChange: (value: boolean) => void;
}) {
  if (!currentUser) return <EmptyState text="Brak wybranego użytkownika." />;

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex justify-end">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
          onClick={() => onFormOpenChange(!isFormOpen)}
          type="button"
        >
          <Plus size={18} />
          {isFormOpen ? "Ukryj formularz" : "Dodaj wydatek"}
        </button>
      </div>

      {isFormOpen ? (
        <form className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-soft" onSubmit={onAddExpense}>
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-slate-950">Dodaj wydatek</h3>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={() => onFormOpenChange(false)}
              type="button"
            >
              Anuluj
            </button>
          </div>
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            <Field label="Data wydatku" name="expenseDate" required type="date" />
            <Field label="Nazwa wydatku" name="name" required />
            <Field label="Kwota zakupu" name="purchaseAmount" required type="number" step="0.01" min="0.01" />
            <Field label="Kwota do zwrotu" name="refundAmount" required type="number" step="0.01" min="0.01" />
            <Field label="Nazwa kontrahenta" name="contractorName" required />
            <Field label="NIP kontrahenta" name="contractorNip" required />
            <label className="block min-w-0">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Cel</span>
              <select className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4" name="purpose" required defaultValue="">
                <option value="" disabled>Wybierz cel</option>
                <option value="PRIORITY">Priorytetowy</option>
                <option value="DETAILED">Szczegółowy</option>
              </select>
            </label>
            <div className="min-w-0 lg:col-span-2">
              <Field label="Opis" name="description" textarea />
            </div>
            <div className="min-w-0 rounded-lg border border-orange-100 bg-orange-50/60 p-4 lg:col-span-2">
              <h4 className="text-sm font-bold text-slate-900">Załączniki</h4>
              <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-2">
                <FileField label="Faktura" name="invoice" required />
                <FileField label="Pozostałe dokumenty" name="additional" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-700 sm:w-auto" type="submit">
                <Plus size={18} />
                Zapisz wydatek
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <ExpensesTable beneficiaryMode expenses={expenses} users={[currentUser]} />
    </div>
  );
}

function AdminExpensesView({
  beneficiaries,
  selectedBeneficiaryId,
  expenses,
  users,
  commentDrafts,
  statusFilter,
  purposeFilter,
  dateFrom,
  dateTo,
  onBeneficiaryChange,
  onStatusFilterChange,
  onPurposeFilterChange,
  onDateFromChange,
  onDateToChange,
  onStatus,
  onCommentDraftChange,
  onCommentSave
}: {
  beneficiaries: User[];
  selectedBeneficiaryId: string;
  expenses: Expense[];
  users: User[];
  commentDrafts: Record<string, string>;
  statusFilter: "all" | ExpenseStatus;
  purposeFilter: "all" | ExpensePurpose;
  dateFrom: string;
  dateTo: string;
  onBeneficiaryChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | ExpenseStatus) => void;
  onPurposeFilterChange: (value: "all" | ExpensePurpose) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onStatus: (expenseId: string, action: "approve" | "reject") => void;
  onCommentDraftChange: (expenseId: string, value: string) => void;
  onCommentSave: (expenseId: string) => void;
}) {
  const title = selectedBeneficiaryId === "all" ? "Wydatki: wszyscy beneficjenci" : `Wydatki: ${beneficiaries.find((beneficiary) => beneficiary.id === selectedBeneficiaryId)?.name ?? "beneficjent"}`;

  return (
    <div className="w-full min-w-0 space-y-5">
      <Panel title="Filtry wydatków">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SelectField label="Beneficjent" value={selectedBeneficiaryId} onChange={onBeneficiaryChange}>
            <option value="all">WSZYSCY</option>
            {beneficiaries.map((beneficiary) => <option key={beneficiary.id} value={beneficiary.id}>{beneficiary.name}</option>)}
          </SelectField>
          <SelectField label="Status" value={statusFilter} onChange={(value) => onStatusFilterChange(value as "all" | ExpenseStatus)}>
            <option value="all">Wszystkie</option>
            <option value="NOWY">NOWY</option>
            <option value="ZAAKCEPTOWANO">ZAAKCEPTOWANO</option>
            <option value="ODRZUCONO">ODRZUCONO</option>
          </SelectField>
          <SelectField label="Cel" value={purposeFilter} onChange={(value) => onPurposeFilterChange(value as "all" | ExpensePurpose)}>
            <option value="all">Wszystkie</option>
            <option value="PRIORITY">Priorytetowy</option>
            <option value="DETAILED">Szczegółowy</option>
          </SelectField>
          <Field label="Data od" name="dateFromFilter" type="date" value={dateFrom} onValueChange={onDateFromChange} />
          <Field label="Data do" name="dateToFilter" type="date" value={dateTo} onValueChange={onDateToChange} />
        </div>
      </Panel>
      <ExpensesTable
        adminMode
        commentDrafts={commentDrafts}
        expenses={expenses}
        title={title}
        users={users}
        onCommentDraftChange={onCommentDraftChange}
        onCommentSave={onCommentSave}
        onStatus={onStatus}
      />
    </div>
  );
}

function ExpensesTable({
  expenses,
  users,
  title = "Lista wydatków",
  adminMode,
  beneficiaryMode,
  commentDrafts = {},
  onStatus,
  onCommentDraftChange,
  onCommentSave
}: {
  expenses: Expense[];
  users: User[];
  title?: string;
  adminMode?: boolean;
  beneficiaryMode?: boolean;
  commentDrafts?: Record<string, string>;
  onStatus?: (expenseId: string, action: "approve" | "reject") => void;
  onCommentDraftChange?: (expenseId: string, value: string) => void;
  onCommentSave?: (expenseId: string) => void;
}) {
  return (
    <Panel title={title}>
      <TableShell empty={expenses.length === 0 ? "Brak wydatków do wyświetlenia." : ""}>
        {expenses.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data wydatku</th>
                <th className="px-4 py-3">Data dodania</th>
                {adminMode ? <th className="px-4 py-3">Beneficjent</th> : null}
                <th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Opis</th>
                <th className="px-4 py-3">Kontrahent</th>
                <th className="px-4 py-3">NIP</th>
                <th className="px-4 py-3">Cel</th>
                <th className="px-4 py-3">Kwota zakupu</th>
                <th className="px-4 py-3">Kwota do zwrotu</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Komentarz</th>
                <th className="px-4 py-3">Faktura</th>
                <th className="px-4 py-3">Pozostałe dokumenty</th>
                {adminMode ? <th className="px-4 py-3">Akcje</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => {
                const beneficiary = users.find((user) => user.id === expense.beneficiaryId);
                return (
                  <tr key={expense.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{displayExpenseDate(expense.expenseDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateTimeFormatter.format(new Date(expense.createdAt))}</td>
                    {adminMode ? <td className="px-4 py-3 font-semibold text-slate-900">{beneficiary?.name ?? "Beneficjent"}</td> : null}
                    <td className="px-4 py-3 font-semibold text-slate-900">{expense.name}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{expense.description || "Brak opisu"}</td>
                    <td className="px-4 py-3 text-slate-700">{displayValue(expense.contractorName)}</td>
                    <td className="px-4 py-3 text-slate-700">{displayValue(expense.contractorNip)}</td>
                    <td className="px-4 py-3 text-slate-700">{purposeLabel(expense.purpose)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{currencyFormatter.format(expense.purchaseAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{currencyFormatter.format(expense.refundAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(expense.status)}`}>{expense.status}</span>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-slate-600">
                      {adminMode ? (
                        <div className="flex min-w-64 gap-2">
                          <input className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4" onChange={(event) => onCommentDraftChange?.(expense.id, event.target.value)} placeholder="Dodaj komentarz" value={commentDrafts[expense.id] ?? expense.adminComment} />
                          <button className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-50" onClick={() => onCommentSave?.(expense.id)} type="button">
                            <MessageSquare size={14} />
                            Zapisz
                          </button>
                        </div>
                      ) : expense.adminComment || "Brak komentarza"}
                    </td>
                    <td className="px-4 py-3">
                      <DownloadCell href={`/api/expenses/${expense.id}/download?type=invoice`} label="Pobierz fakturę" fileName={invoiceName(expense)} fileSize={invoiceSize(expense)} />
                    </td>
                    <td className="px-4 py-3">
                      {expense.additionalOriginalFileName ? (
                        <DownloadCell href={`/api/expenses/${expense.id}/download?type=additional`} label="Pobierz dokumenty" fileName={expense.additionalOriginalFileName} fileSize={expense.additionalFileSize} />
                      ) : "Brak"}
                    </td>
                    {adminMode ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700" onClick={() => onStatus?.(expense.id, "approve")} type="button">
                            <Check size={14} />
                            Zatwierdź
                          </button>
                          <button className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700" onClick={() => onStatus?.(expense.id, "reject")} type="button">
                            <X size={14} />
                            Odrzuć
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </TableShell>
      {beneficiaryMode ? <p className="mt-3 text-xs text-slate-500">Komentarz ADMINA jest widoczny od razu po zapisaniu przez fundusz.</p> : null}
    </Panel>
  );
}

function OnboardingView({
  beneficiaries,
  currentUser,
  documents,
  isAdmin,
  selectedBeneficiaryId,
  section,
  users,
  onBeneficiaryChange,
  onSectionChange,
  onUpload
}: {
  beneficiaries: User[];
  currentUser: User | undefined;
  documents: OnboardingDocument[];
  isAdmin: boolean;
  selectedBeneficiaryId: string;
  section: OnboardingSection;
  users: User[];
  onBeneficiaryChange: (value: string) => void;
  onSectionChange: (value: OnboardingSection) => void;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const sections: { id: OnboardingSection; label: string }[] = [
    { id: "welcome", label: "Witamy" },
    { id: "marketing", label: "Paczka marketingowa" },
    { id: "contact", label: "Kontakt" },
    { id: "documents", label: "Dokumenty do wypełnienia" }
  ];

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="flex min-w-0 flex-wrap gap-2">
        {sections.map((item) => <TabButton key={item.id} active={section === item.id} onClick={() => onSectionChange(item.id)}>{item.label}</TabButton>)}
      </div>

      {section === "welcome" ? (
        <OnboardingText title="Witamy w programie akceleracyjnym.">
          <p>W tej sekcji znajdziesz najważniejsze informacje potrzebne na początku współpracy z funduszem. DocHelper pomoże Ci uporządkować dokumenty, materiały oraz podstawową komunikację związaną z udziałem w programie.</p>
          <p>Na tym etapie aplikacja służy przede wszystkim do przekazywania dokumentów, pobierania materiałów oraz kontroli statusu wybranych spraw.</p>
        </OnboardingText>
      ) : null}

      {section === "marketing" ? (
        <OnboardingText title="Paczka marketingowa">
          <p>Paczka marketingowa zawiera podstawowe materiały, które mogą być potrzebne do komunikacji udziału w programie akceleracyjnym.</p>
          <p>W kolejnych wersjach aplikacji w tej sekcji będzie można pobierać materiały takie jak logotypy, grafiki, szablony prezentacji, informacje o zasadach oznaczania funduszu oraz inne pliki pomocne w działaniach komunikacyjnych.</p>
          <p>Na potrzeby obecnego MVP sekcja ma charakter informacyjny.</p>
        </OnboardingText>
      ) : null}

      {section === "contact" ? (
        <OnboardingText title="Kontakt z funduszem">
          <p>W przypadku pytań dotyczących dokumentów, rozliczenia wydatków albo udziału w programie, skontaktuj się z opiekunem programu po stronie funduszu.</p>
          <p>Przed wysłaniem wiadomości sprawdź, czy wymagany dokument został już dodany w odpowiedniej sekcji aplikacji oraz czy jego status nie został wcześniej zaktualizowany przez ADMINA.</p>
          <p>W sprawach organizacyjnych przygotuj krótki opis problemu oraz nazwę beneficjenta, którego dotyczy zgłoszenie. Ułatwi to szybszą weryfikację i odpowiedź ze strony funduszu.</p>
          <p>Dane kontaktowe funduszu zostaną uzupełnione w kolejnej wersji aplikacji.</p>
          <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm font-semibold text-slate-800">
            <p>E-mail: kontakt@fundusz.pl</p>
            <p>Telefon: +48 000 000 000</p>
          </div>
        </OnboardingText>
      ) : null}

      {section === "documents" ? (
        <div className="grid w-full min-w-0 gap-5 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Panel title="Formularz onboardingowy">
            <a className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700" href="/api/onboarding/placeholder">
              <Download size={16} />
              Pobierz placeholder PDF
            </a>
            {!isAdmin && currentUser?.role === "BENEFICIARY" ? (
              <form className="mt-5 space-y-4" onSubmit={onUpload}>
                <Field label="Nazwa dokumentu" name="name" required />
                <FileField label="Plik" name="file" required />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-700" type="submit">
                  <Send size={17} />
                  Wyślij dokument
                </button>
              </form>
            ) : null}
            {isAdmin ? (
              <div className="mt-5">
                <SelectField label="Filtr beneficjenta" value={selectedBeneficiaryId} onChange={onBeneficiaryChange}>
                  <option value="all">WSZYSCY</option>
                  {beneficiaries.map((beneficiary) => <option key={beneficiary.id} value={beneficiary.id}>{beneficiary.name}</option>)}
                </SelectField>
              </div>
            ) : null}
          </Panel>
          <OnboardingDocumentsTable documents={documents} isAdmin={isAdmin} users={users} />
        </div>
      ) : null}
    </div>
  );
}

function OnboardingDocumentsTable({ documents, isAdmin, users }: { documents: OnboardingDocument[]; isAdmin: boolean; users: User[] }) {
  return (
    <Panel title={isAdmin ? "Dokumenty wysłane przez beneficjentów" : "Moje wysłane dokumenty"}>
      <TableShell empty={documents.length === 0 ? "Brak dokumentów do wyświetlenia." : ""}>
        {documents.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data dodania</th>
                {isAdmin ? <th className="px-4 py-3">Beneficjent</th> : null}
                <th className="px-4 py-3">Nazwa dokumentu</th>
                <th className="px-4 py-3">Nazwa pliku</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => {
                const beneficiary = users.find((user) => user.id === document.beneficiaryId);
                return (
                  <tr key={document.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateTimeFormatter.format(new Date(document.createdAt))}</td>
                    {isAdmin ? <td className="px-4 py-3 font-semibold text-slate-900">{beneficiary?.name ?? "Beneficjent"}</td> : null}
                    <td className="px-4 py-3 font-semibold text-slate-900">{document.name}</td>
                    <td className="px-4 py-3 text-slate-600">{document.originalFileName} · {fileSizeLabel(document.fileSize)}</td>
                    <td className="px-4 py-3"><DownloadCell href={`/api/onboarding/${document.id}/download`} label="Pobierz" fileName={document.originalFileName} fileSize={document.fileSize} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </TableShell>
    </Panel>
  );
}

function OnboardingText({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title}>
      <div className="max-w-3xl space-y-4 text-slate-600">{children}</div>
    </Panel>
  );
}

function DownloadCell({ href, label, fileName, fileSize }: { href: string; label: string; fileName?: string; fileSize?: number }) {
  if (!fileName) return <span className="text-slate-500">Brak danych</span>;

  return (
    <div className="min-w-0">
      <a className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50" href={href}>
        <Download size={14} />
        {label}
      </a>
      <div className="mt-1 max-w-48 truncate text-xs text-slate-400">{fileName}{fileSize ? ` · ${fileSizeLabel(fileSize)}` : ""}</div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <select className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Field({
  label,
  name,
  required,
  textarea,
  type = "text",
  step,
  min,
  value,
  onValueChange
}: {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  type?: string;
  step?: string;
  min?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const commonClass = "w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4";
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {textarea ? (
        <textarea className={`min-h-24 ${commonClass}`} name={name} required={required} />
      ) : (
        <input className={commonClass} min={min} name={name} onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined} required={required} step={step} type={type} value={value} />
      )}
    </label>
  );
}

function FileField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" name={name} required={required} type="file" />
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

function TableShell({ children, empty }: { children: React.ReactNode; empty: string }) {
  return <div className="w-full max-w-full overflow-x-auto rounded-lg border border-slate-200">{empty ? <div className="bg-slate-50 p-6 text-sm text-slate-500">{empty}</div> : children}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500 shadow-soft">{text}</div>;
}
