import { AddActivityForm } from "./AddActivityForm";

export default function AddActivityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Activity</h1>
        <p className="text-muted-foreground">
          Log a new activity to track your time
        </p>
      </div>
      <AddActivityForm />
    </div>
  );
}
