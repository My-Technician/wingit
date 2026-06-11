import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TitleBar } from "@/components/layout/TitleBar";
import { InstallQueueBar } from "@/components/layout/InstallQueueBar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-hidden pl-5 pr-2 py-5">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
          <InstallQueueBar />
        </div>
      </div>
    </div>
  );
}
