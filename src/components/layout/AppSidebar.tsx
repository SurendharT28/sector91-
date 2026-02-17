import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, TrendingUp, ClipboardList, Activity, Menu, X, LogOut, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import s91Logo from "@/assets/s91-logo.png";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/investors", icon: Users, label: "Investors" },
  { to: "/trading", icon: TrendingUp, label: "Trading" },
  { to: "/returns", icon: ClipboardList, label: "Returns" },
  { to: "/expenses", icon: Receipt, label: "Expense" },
  { to: "/audit", icon: Activity, label: "Audit Log" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    sessionStorage.removeItem("s91_authenticated");
    navigate("/login");
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex h-14 md:h-16 items-center gap-3 border-b border-border px-4 md:px-6 shrink-0">
        <img src={s91Logo} alt="Sector 91" className="h-8 w-8 md:h-9 md:w-9 rounded-lg object-contain" />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">Sector 91</h1>
          <p className="text-[10px] md:text-[11px] text-muted-foreground">Trading Platform</p>
        </div>
        {/* Mobile close button */}
        <button
          className="ml-auto md:hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 md:p-4 shrink-0 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
        <div className="flex items-center gap-2 px-2">
          <div className="h-2 w-2 rounded-full bg-profit animate-pulse-glow" />
          <span className="text-xs text-muted-foreground">System Online</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 md:hidden">
        <button
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src={s91Logo} alt="Sector 91" className="h-7 w-7 rounded-md object-contain" />
        <span className="text-sm font-semibold text-foreground">Sector 91</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — mobile: overlay drawer, desktop: fixed */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-sidebar
          transition-transform duration-300 ease-in-out
          md:z-40 md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
