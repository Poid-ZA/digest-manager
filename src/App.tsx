import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import FeedsPage from "@/pages/FeedsPage";
import DigestConfigPage from "@/pages/DigestConfigPage";
import RunDashboardPage from "@/pages/RunDashboardPage";
import ContentBrowserPage from "@/pages/ContentBrowserPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<FeedsPage />} />
            <Route path="/config" element={<DigestConfigPage />} />
            <Route path="/runs" element={<RunDashboardPage />} />
            <Route path="/content" element={<ContentBrowserPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
