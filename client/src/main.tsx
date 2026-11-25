import Sentry from "./lib/sentry";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { ThemeProvider } from "./lib/theme";
import "./index.css";
import App from "./App.tsx";

function shouldReportToSentry(error: unknown): boolean {
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
    return false;
  }
  return true;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (shouldReportToSentry(error)) {
        Sentry.captureException(error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (shouldReportToSentry(error)) {
        Sentry.captureException(error);
      }
    },
  }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">
            Something went wrong. Please refresh the page.
          </p>
        </div>
      }
    >
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
