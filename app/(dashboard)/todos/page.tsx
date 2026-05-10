import { TodoManager } from "./TodoManager";

export default function TodosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">To Do</h1>
        <p className="text-muted-foreground">
          Add, edit, complete, and track your tasks.
        </p>
      </div>
      <TodoManager />
    </div>
  );
}
