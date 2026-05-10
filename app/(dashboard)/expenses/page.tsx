import { ExpensePlanner } from "./ExpensePlanner";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Expense Plan</h1>
        <p className="text-muted-foreground">
          Track recurring and one-time bills with monthly total auto calculation.
        </p>
      </div>
      <ExpensePlanner />
    </div>
  );
}
