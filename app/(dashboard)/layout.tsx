import { requireAuth } from "@/lib/getSession";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="pl-64 pt-4">
        <div className="container mx-auto px-6 pb-12">{children}</div>
      </main>
    </div>
  );
}
