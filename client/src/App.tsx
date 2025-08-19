import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
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
