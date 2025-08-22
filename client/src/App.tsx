import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./components/Header";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import { Certificate } from "./pages/Certificate";
import NotFound from "@/pages/not-found";
import './lib/i18n';
import { useEffect } from "react";
import { useLanguage } from "./hooks/useLanguage";

function Router() {
  const [location] = useLocation();
  const { changeLanguage, currentLanguage } = useLanguage();

  // Handle language switching via URL paths
  useEffect(() => {
    const pathSegments = location.split('/').filter(Boolean);
    const langFromPath = pathSegments[0];
    
    if (langFromPath === 'en' || langFromPath === 'fa') {
      if (currentLanguage !== langFromPath) {
        changeLanguage(langFromPath);
      }
    }
  }, [location, currentLanguage, changeLanguage]);

  return (
    <Switch>
      {/* Language-specific routes */}
      <Route path="/en" component={Home} />
      <Route path="/fa" component={Home} />
      <Route path="/en/admin24" component={Admin} />
      <Route path="/fa/admin24" component={Admin} />
      <Route path="/en/faq" component={FAQ} />
      <Route path="/fa/faq" component={FAQ} />
      <Route path="/en/terms" component={Terms} />
      <Route path="/fa/terms" component={Terms} />
      <Route path="/en/certificate" component={Certificate} />
      <Route path="/fa/certificate" component={Certificate} />
      
      {/* Legacy routes without language prefix - redirect to current language */}
      <Route path="/" component={Home} />
      <Route path="/admin24" component={Admin} />
      <Route path="/faq" component={FAQ} />
      <Route path="/terms" component={Terms} />
      <Route path="/certificate" component={Certificate} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-chess-black text-white">
          <Header />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
