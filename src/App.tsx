import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/use-language";
import { t } from "@/lib/i18n";
import Index from "./pages/Index.tsx";
import { AuthProvider } from "./hooks/use-auth.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

const BeltConfigurator = lazy(() => import("./pages/BeltConfigurator.tsx"));
const ProfileConfigurator = lazy(() => import("./pages/ProfileConfigurator.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));

const queryClient = new QueryClient();

const App = () => {
  const [lang] = useLanguage();

  useEffect(() => {
    document.title = "NOVAMOTIS Configurator";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/belt-conveyor" element={<BeltConfigurator />} />
                  <Route
                    path="/profile-configurator"
                    element={
                      <ProtectedRoute>
                        <ProfileConfigurator />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <footer className="border-t border-slate-200 bg-white/90 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm text-muted-foreground flex items-center justify-center gap-4">
                  <a href="https://www.novamotis.com/impressum" target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-4">
                    {t('imprintLink', lang)}
                  </a>
                  <span aria-hidden="true">|</span>
                  <a href="https://www.novamotis.com/protection" target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-4">
                    {t('privacyPolicyLink', lang)}
                  </a>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
