import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      {/* pt-14 on mobile for top bar, md:pt-0 for desktop; md:ml-64 for sidebar */}
      <main className="min-h-screen pt-14 md:pt-0 md:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
