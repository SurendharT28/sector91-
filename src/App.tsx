import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Investors from "@/pages/Investors";
import InvestorProfile from "@/pages/InvestorProfile";
import Trading from "@/pages/Trading";
import TradingAccountProfile from "@/pages/TradingAccountProfile";

import Returns from "@/pages/Returns";
import Expenses from "@/pages/Expenses";
import AuditLog from "@/pages/AuditLog";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/investors" element={<Investors />} />
              <Route path="/investors/:id" element={<InvestorProfile />} />
              <Route path="/trading" element={<Trading />} />
              <Route path="/trading/:id" element={<TradingAccountProfile />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/audit" element={<AuditLog />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
