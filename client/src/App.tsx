import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function MigrationBanner() {
  const { user } = useAuth();
  const emailBackup = trpc.agent.emailBackup.useMutation({
    onSuccess: result => toast.success(`Backup enviado para ${result.email}.`),
    onError: error => toast.error(error.message),
  });

  return (
    <div
      role="status"
      aria-label="Aviso importante sobre a atualização da Nova Odisseia"
      className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-sm"
    >
      <strong className="font-semibold">A Nova Odisseia está mudando.</strong>{" "}
      Salve até 24/09 as informações que deseja manter. A partir de 25/09,
      algumas funcionalidades serão reorganizadas ou removidas para adequação
      às diretrizes de segurança e compliance.
      {user && (
        <button
          type="button"
          disabled={emailBackup.isPending}
          onClick={() => emailBackup.mutate()}
          className="mx-auto mt-3 block w-full max-w-xl rounded-xl bg-amber-950 px-6 py-3 text-base font-semibold text-amber-50 shadow-md transition hover:bg-amber-900 disabled:cursor-wait disabled:opacity-70"
        >
          {emailBackup.isPending
            ? "Compilando e enviando seu backup..."
            : "Receber Backup da minha odisseia por email!"}
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <MigrationBanner />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
