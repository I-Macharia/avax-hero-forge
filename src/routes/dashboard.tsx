import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DashboardContent } from "@/routes/_authenticated/dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Avax Hero Forge" },
      {
        name: "description",
        content: "Public trophy room showing the MiniHack badge collection and registered quest badges.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <DashboardContent />
      </main>
      <SiteFooter />
    </div>
  );
}
