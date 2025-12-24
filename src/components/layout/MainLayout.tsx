import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <Topbar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
