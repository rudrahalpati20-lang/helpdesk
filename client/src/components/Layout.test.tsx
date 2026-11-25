import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Role } from "core/constants/role.ts";
import Layout from "./Layout";

// ---------------------------------------------------------------------------
// Mock auth-client so Layout's useSession() returns a controllable value
// ---------------------------------------------------------------------------
vi.mock("../lib/auth-client", () => ({
  useSession: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

// Mock theme so Layout renders without a real ThemeProvider
vi.mock("../lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

import { useSession } from "../lib/auth-client";
const mockedUseSession = vi.mocked(useSession);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLayout(
  initialPath = "/",
  session: ReturnType<typeof mockedUseSession>["data"] = null
) {
  mockedUseSession.mockReturnValue({
    data: session,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  } as any);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div>Dashboard page</div>} />
            <Route path="/tickets" element={<div>Tickets page</div>} />
            <Route path="/users" element={<div>Users page</div>} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const adminSession = {
  user: { id: "1", name: "Admin User", email: "admin@example.com", role: Role.admin },
  session: { id: "s1", userId: "1", token: "tok", expiresAt: new Date() },
};

const agentSession = {
  user: { id: "2", name: "Agent User", email: "agent@example.com", role: Role.agent },
  session: { id: "s2", userId: "2", token: "tok", expiresAt: new Date() },
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Layout – navigation", () => {
  it("should always show the Tickets link in the navbar", () => {
    renderLayout("/", adminSession);

    expect(screen.getByRole("link", { name: /tickets/i })).toBeInTheDocument();
  });

  it("should show the Users link only for admin users", () => {
    renderLayout("/", adminSession);

    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
  });

  it("should NOT show the Users link for non-admin users", () => {
    renderLayout("/", agentSession);

    expect(screen.queryByRole("link", { name: /users/i })).not.toBeInTheDocument();
  });

  it("should navigate to /tickets when clicking the Tickets link", async () => {
    const user = userEvent.setup();
    renderLayout("/", adminSession);

    await user.click(screen.getByRole("link", { name: /tickets/i }));

    expect(screen.getByText("Tickets page")).toBeInTheDocument();
  });

  it("should display the signed-in user's name in the navbar", () => {
    renderLayout("/", adminSession);

    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("should render the Sign out button", () => {
    renderLayout("/", adminSession);

    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("should render the Helpdesk logo link", () => {
    renderLayout("/", adminSession);

    expect(screen.getByRole("link", { name: /helpdesk/i })).toBeInTheDocument();
  });
});
