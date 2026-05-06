"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Download, FileText, MessageSquare, Plus, RefreshCw, X } from "lucide-react";
import type { ApiError, Expense, User } from "@/lib/types";

type Tab = "expenses" | "onboarding" | "settings";

const currencyFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN"
});

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short"
});

function statusClass(status: Expense["status"]) {
  if (status === "ZAAKCEPTOWANO") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }
  if (status === "ODRZUCONO") {
    return "bg-red-100 text-red-700 ring-red-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function fileSizeLabel(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
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
  const [selectedUserId, setSelectedUserId] = useState("admin");
  const [adminBeneficiaryId, setAdminBeneficiaryId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const currentUser = users.find((user) => user.id === selectedUserId);
  const isAdmin = currentUser?.role === "ADMIN";
  const beneficiaries = users.filter((user) => user.role === "BENEFICIARY");
  const activeUsers = users.filter((user) => user.role === "ADMIN" || user.isActive);

  const visibleExpenses = useMemo(() => {
    if (isAdmin) {
      return adminBeneficiaryId ? expenses.filter((expense) => expense.beneficiaryId === adminBeneficiaryId) : [];
    }
    return currentUser ? expenses.filter((expense) => expense.beneficiaryId === currentUser.id) : [];
  }, [adminBeneficiaryId, currentUser, expenses, isAdmin]);

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab === "settings") {
      setActiveTab("expenses");
    }
  }, [activeTab, isAdmin]);

  async function refreshData() {
    setIsLoading(true);
    setError("");
    try {
      const [usersResponse, expensesResponse] = await Promise.all([fetch("/api/users"), fetch("/api/expenses")]);
      const [nextUsers, nextExpenses] = await Promise.all([
        parseResponse<User[]>(usersResponse),
        parseResponse<Expense[]>(expensesResponse)
      ]);
      setUsers(nextUsers);
      setExpenses(nextExpenses);
      if (!nextUsers.some((user) => user.id === selectedUserId && (user.role === "ADMIN" || user.isActive))) {
        setSelectedUserId("admin");
      }
      if (!adminBeneficiaryId && nextUsers.some((user) => user.role === "BENEFICIARY")) {
        setAdminBeneficiaryId(nextUsers.find((user) => user.role === "BENEFICIARY")?.id ?? "");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nie udało się odświeżyć danych.");
    } finally {
      setIsLoading(false);
    }
  }

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
        body: JSON.stringify({
          name,
          description: String(formData.get("description") ?? "").trim()
        })
      });
      const user = await parseResponse<User>(response);
      form.reset();
      showNotice("Beneficjent został dodany, a folder wydatków utworzony.");
      await refreshData();
      setAdminBeneficiaryId(user.id);
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
    const file = formData.get("file") as File | null;
    const name = String(formData.get("name") ?? "").trim();
    const purchaseAmount = Number(String(formData.get("purchaseAmount") ?? "").replace(",", "."));
    const refundAmount = Number(String(formData.get("refundAmount") ?? "").replace(",", "."));

    if (!file || file.size === 0) {
      showError("Plik jest wymagany.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showError("Plik nie może przekraczać 25 MB.");
      return;
    }
    if (!name) {
      showError("Nazwa wydatku jest wymagana.");
      return;
    }
    if (!purchaseAmount || purchaseAmount <= 0 || !refundAmount || refundAmount <= 0) {
      showError("Kwoty muszą być większe od zera.");
      return;
    }

    formData.set("beneficiaryId", currentUser.id);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        body: formData
      });
      await parseResponse<Expense>(response);
      form.reset();
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

  const selectedAdminBeneficiary = beneficiaries.find((user) => user.id === adminBeneficiaryId);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0,#f8fafc_260px)]">
      <header className="border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-600 text-white shadow-soft">
              <FileText size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">DocHelper</h1>
              <p className="text-sm text-slate-500">Lokalna obsługa beneficjentów i wydatków</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap gap-2">
              <TabButton active={activeTab === "expenses"} onClick={() => setActiveTab("expenses")}>
                WYDATKI
              </TabButton>
              <TabButton active={activeTab === "onboarding"} onClick={() => setActiveTab("onboarding")}>
                DOKUMENTY ONBOARDING
              </TabButton>
              {isAdmin ? (
                <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
                  USTAWIENIA
                </TabButton>
              ) : null}
            </nav>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="font-medium text-slate-600">Użytkownik:</span>
              <select
                className="bg-transparent font-semibold text-slate-900 outline-none"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
              {isAdmin ? "Panel funduszu" : "Panel beneficjenta"}
            </p>
            <h2 className="mt-1 text-3xl font-bold text-slate-950">
              {activeTab === "expenses"
                ? "Wydatki"
                : activeTab === "settings"
                  ? "Ustawienia"
                  : "Dokumenty onboarding"}
            </h2>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
            onClick={refreshData}
            type="button"
          >
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
          <OnboardingPlaceholder isAdmin={Boolean(isAdmin)} />
        ) : isAdmin ? (
          <AdminExpensesView
            beneficiaries={beneficiaries}
            selectedBeneficiaryId={adminBeneficiaryId}
            selectedBeneficiaryName={selectedAdminBeneficiary?.name}
            expenses={visibleExpenses}
            users={users}
            commentDrafts={commentDrafts}
            onBeneficiaryChange={setAdminBeneficiaryId}
            onStatus={handleStatus}
            onCommentDraftChange={(expenseId, value) => setCommentDrafts((drafts) => ({ ...drafts, [expenseId]: value }))}
            onCommentSave={handleComment}
          />
        ) : (
          <BeneficiaryExpensesView currentUser={currentUser} expenses={visibleExpenses} onAddExpense={handleAddExpense} />
        )}
      </section>
    </main>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
        active ? "bg-orange-600 text-white shadow-sm" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SettingsView({
  beneficiaries,
  onAddBeneficiary
}: {
  beneficiaries: User[];
  onAddBeneficiary: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
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
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-lg font-bold text-slate-950">Lista beneficjentów</h3>
        <TableShell empty={beneficiaries.length === 0 ? "Brak beneficjentów do wyświetlenia." : ""}>
          {beneficiaries.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nazwa</th>
                  <th className="px-4 py-3">Opis</th>
                  <th className="px-4 py-3">Folder</th>
                </tr>
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
      </div>
    </div>
  );
}

function BeneficiaryExpensesView({
  currentUser,
  expenses,
  onAddExpense
}: {
  currentUser: User | undefined;
  expenses: Expense[];
  onAddExpense: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!currentUser) {
    return <EmptyState text="Brak wybranego użytkownika." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft" onSubmit={onAddExpense}>
        <h3 className="text-lg font-bold text-slate-950">Dodaj wydatek</h3>
        <div className="mt-4 space-y-4">
          <Field label="Nazwa wydatku" name="name" required />
          <Field label="Opis" name="description" textarea />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kwota zakupu" name="purchaseAmount" required type="number" step="0.01" min="0.01" />
            <Field label="Kwota do zwrotu" name="refundAmount" required type="number" step="0.01" min="0.01" />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Plik dokumentu</span>
            <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" name="file" required type="file" />
          </label>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-700" type="submit">
            <Plus size={18} />
            Zapisz wydatek
          </button>
        </div>
      </form>
      <ExpensesTable beneficiaryMode expenses={expenses} users={[currentUser]} />
    </div>
  );
}

function AdminExpensesView({
  beneficiaries,
  selectedBeneficiaryId,
  selectedBeneficiaryName,
  expenses,
  users,
  commentDrafts,
  onBeneficiaryChange,
  onStatus,
  onCommentDraftChange,
  onCommentSave
}: {
  beneficiaries: User[];
  selectedBeneficiaryId: string;
  selectedBeneficiaryName?: string;
  expenses: Expense[];
  users: User[];
  commentDrafts: Record<string, string>;
  onBeneficiaryChange: (value: string) => void;
  onStatus: (expenseId: string, action: "approve" | "reject") => void;
  onCommentDraftChange: (expenseId: string, value: string) => void;
  onCommentSave: (expenseId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Wybierz beneficjenta</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4"
            value={selectedBeneficiaryId}
            onChange={(event) => onBeneficiaryChange(event.target.value)}
          >
            <option value="">Wybierz beneficjenta</option>
            {beneficiaries.map((beneficiary) => (
              <option key={beneficiary.id} value={beneficiary.id}>
                {beneficiary.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!selectedBeneficiaryId ? (
        <EmptyState text="Wybierz beneficjenta, aby zobaczyć jego wydatki." />
      ) : (
        <ExpensesTable
          adminMode
          expenses={expenses}
          users={users}
          title={`Wydatki: ${selectedBeneficiaryName ?? "beneficjent"}`}
          commentDrafts={commentDrafts}
          onStatus={onStatus}
          onCommentDraftChange={onCommentDraftChange}
          onCommentSave={onCommentSave}
        />
      )}
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <TableShell empty={expenses.length === 0 ? "Brak wydatków do wyświetlenia." : ""}>
        {expenses.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data dodania</th>
                {adminMode ? <th className="px-4 py-3">Beneficjent</th> : null}
                <th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Opis</th>
                <th className="px-4 py-3">Kwota zakupu</th>
                <th className="px-4 py-3">Kwota do zwrotu</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Komentarz</th>
                <th className="px-4 py-3">Plik</th>
                {adminMode ? <th className="px-4 py-3">Akcje</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => {
                const beneficiary = users.find((user) => user.id === expense.beneficiaryId);
                return (
                  <tr key={expense.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateFormatter.format(new Date(expense.createdAt))}</td>
                    {adminMode ? <td className="px-4 py-3 font-semibold text-slate-900">{beneficiary?.name ?? "Beneficjent"}</td> : null}
                    <td className="px-4 py-3 font-semibold text-slate-900">{expense.name}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{expense.description || "Brak opisu"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{currencyFormatter.format(expense.purchaseAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{currencyFormatter.format(expense.refundAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="min-w-56 px-4 py-3 text-slate-600">
                      {adminMode ? (
                        <div className="flex min-w-64 gap-2">
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4"
                            onChange={(event) => onCommentDraftChange?.(expense.id, event.target.value)}
                            placeholder="Dodaj komentarz"
                            value={commentDrafts[expense.id] ?? expense.adminComment}
                          />
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-50"
                            onClick={() => onCommentSave?.(expense.id)}
                            type="button"
                          >
                            <MessageSquare size={14} />
                            Zapisz
                          </button>
                        </div>
                      ) : (
                        expense.adminComment || "Brak komentarza"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        href={`/api/expenses/${expense.id}/download`}
                      >
                        <Download size={14} />
                        Pobierz
                      </a>
                      <div className="mt-1 text-xs text-slate-400">
                        {expense.originalFileName} · {fileSizeLabel(expense.fileSize)}
                      </div>
                    </td>
                    {adminMode ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                            onClick={() => onStatus?.(expense.id, "approve")}
                            type="button"
                          >
                            <Check size={14} />
                            Zatwierdź
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                            onClick={() => onStatus?.(expense.id, "reject")}
                            type="button"
                          >
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
    </div>
  );
}

function OnboardingPlaceholder({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="rounded-lg border border-orange-100 bg-white p-8 shadow-soft">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
        <FileText size={24} />
      </div>
      <h3 className="text-xl font-bold text-slate-950">Dokumenty onboardingowe</h3>
      <p className="mt-2 max-w-2xl text-slate-600">
        {isAdmin
          ? "W tej sekcji w kolejnej wersji będzie można dodawać dokumenty onboardingowe dla beneficjentów."
          : "W tej sekcji w kolejnej wersji będą widoczne dokumenty onboardingowe przekazane przez fundusz."}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  textarea,
  type = "text",
  step,
  min
}: {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4"
          name={name}
          required={required}
        />
      ) : (
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-orange-200 transition focus:ring-4"
          min={min}
          name={name}
          required={required}
          step={step}
          type={type}
        />
      )}
    </label>
  );
}

function TableShell({ children, empty }: { children: React.ReactNode; empty: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      {empty ? <div className="bg-slate-50 p-6 text-sm text-slate-500">{empty}</div> : children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500 shadow-soft">{text}</div>;
}
