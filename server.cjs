const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Seed Data matching Mosh Hamedani's Helpdesk
const agents = [
  { id: "user_admin", name: "Mosh Hamedani", email: "admin@example.com", role: "admin" },
  { id: "user_agent_1", name: "Sarah Connor", email: "sarah@helpdesk.local", role: "agent" },
  { id: "user_agent_2", name: "John Doe", email: "john@helpdesk.local", role: "agent" },
  { id: "user_ai", name: "AI Agent", email: "ai@helpdesk.local", role: "agent" }
];

// Database Sessions store (mimics PostgreSQL `session` table)
const dbSessions = new Map();
const dbAccounts = new Map([
  ["admin@example.com", {
    userId: "user_admin",
    password: "AdminPassword123!"
  }]
]);

let tickets = [
  {
    id: 101,
    subject: "Cannot connect to database during migration",
    body: "Hi team,\n\nWhenever I run `prisma migrate dev`, I get an authentication error saying connection refused on port 5432. I have verified my credentials in .env. Can someone please assist?",
    status: "open",
    category: "technical_question",
    senderName: "Alice Smith",
    senderEmail: "alice.smith@clientcorp.io",
    assignedToId: "user_agent_1",
    assignedTo: agents[1],
    aiSummary: "Customer is experiencing PostgreSQL connection refused error on port 5432 when running Prisma migrations despite checking credentials in .env file.",
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    replies: [
      {
        id: 1,
        senderType: "customer",
        body: "I am attaching the error log: `Error: P1001: Can't reach database server at localhost:5432`",
        user: null,
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
      },
      {
        id: 2,
        senderType: "agent",
        body: "Hello Alice,\n\nPlease verify that your PostgreSQL service is actually running. On Windows, open Services and check 'postgresql-x64-16' status, or run `docker ps` if running in container.",
        user: agents[1],
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
      }
    ]
  },
  {
    id: 102,
    subject: "Refund request for annual enterprise license",
    body: "We accidentally purchased two enterprise seat bundles instead of one. Could you please process a refund for invoice #INV-98231? The second purchase was made 2 days ago.",
    status: "resolved",
    category: "refund_request",
    senderName: "David Miller",
    senderEmail: "david@fintechsolutions.com",
    assignedToId: "user_ai",
    assignedTo: agents[3],
    aiSummary: "Duplicate enterprise license purchase inquiry requesting refund for invoice #INV-98231 within the eligible 14-day refund window. Auto-refunded by AI.",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 23).toISOString(),
    replies: [
      {
        id: 3,
        senderType: "agent",
        body: "Hello David,\n\nOur automated billing system has verified invoice #INV-98231 as an accidental duplicate. A full refund of $1,200.00 has been credited back to your original payment method. Expect it within 3-5 business days.",
        user: agents[3],
        createdAt: new Date(Date.now() - 3600 * 1000 * 23).toISOString()
      }
    ]
  },
  {
    id: 103,
    subject: "How to configure custom webhook endpoints in settings?",
    body: "Hello,\n\nIs there documentation on setting up inbound parse webhooks for SendGrid? I checked the knowledge base but only saw outbound SMTP instructions.",
    status: "open",
    category: "general_question",
    senderName: "Elena Rostova",
    senderEmail: "elena@techstart.de",
    assignedToId: "user_admin",
    assignedTo: agents[0],
    aiSummary: "User inquiring about documentation and configuration steps for SendGrid inbound parse webhooks.",
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    replies: []
  },
  {
    id: 104,
    subject: "API rate limiting returning 429 prematurely",
    body: "We noticed our staging server is getting HTTP 429 Too Many Requests after only ~10 requests within a minute, whereas our plan allows up to 120 req/min.",
    status: "open",
    category: "technical_question",
    senderName: "Carlos Santana",
    senderEmail: "carlos@cloudmedia.es",
    assignedToId: "user_agent_2",
    assignedTo: agents[2],
    aiSummary: "API rate limiting triggering 429 Too Many Requests prematurely after ~10 calls. Needs rate limiter window review.",
    createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    replies: [
      {
        id: 4,
        senderType: "agent",
        body: "Hi Carlos,\n\nAre all requests coming from behind a corporate proxy sharing the same IP address? Express rate limiter keys on client IP by default.",
        user: agents[2],
        createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString()
      }
    ]
  },
  {
    id: 105,
    subject: "Requesting SSO SAML 2.0 integration details",
    body: "Does Helpdesk support Okta or Azure AD SAML 2.0 integration for enterprise agent logins? We want to enforce 2FA across our team.",
    status: "resolved",
    category: "general_question",
    senderName: "Rachel Green",
    senderEmail: "rachel@retailgroup.com",
    assignedToId: "user_ai",
    assignedTo: agents[3],
    aiSummary: "Customer asking about Okta/Azure AD SSO SAML 2.0 integration and 2FA enforcement.",
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 46).toISOString(),
    replies: [
      {
        id: 5,
        senderType: "agent",
        body: "Hi Rachel, Better Auth supports OAuth2, OIDC and SAML 2.0 providers. You can enable Okta under Settings > Authentication > SSO.",
        user: agents[3],
        createdAt: new Date(Date.now() - 3600 * 1000 * 46).toISOString()
      }
    ]
  },
  {
    id: 106,
    subject: "Charge discrepancy on monthly add-on tier",
    body: "My credit card shows $49 instead of $29 for the AI ticket auto-responder add-on. Can you check my billing statement?",
    status: "closed",
    category: "refund_request",
    senderName: "Kenji Sato",
    senderEmail: "kenji@tokyosys.jp",
    assignedToId: "user_agent_1",
    assignedTo: agents[1],
    aiSummary: "Billing inquiry regarding $20 pricing tier discrepancy on monthly AI add-on. Resolved with invoice adjustment.",
    createdAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 70).toISOString(),
    replies: []
  }
];

function getStats() {
  const total = tickets.length;
  const open = tickets.filter(t => t.status === "open").length;
  const resolved = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const resolvedAI = tickets.filter(t => t.assignedToId === "user_ai" && (t.status === "resolved" || t.status === "closed")).length;
  const rate = total > 0 ? Math.round((resolvedAI / total) * 100) : 0;
  return {
    totalTickets: total,
    openTickets: open,
    resolvedByAI: resolvedAI,
    aiResolutionRate: rate,
    avgResolutionTime: 4200
  };
}

function getDailyVolume() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => ({
    date: day,
    tickets: [4, 7, 5, 9, 12, 8, 11][i]
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HELPDESK APP (Login -> Dashboard | Tickets | Users) - NO Database in navbar
// ─────────────────────────────────────────────────────────────────────────────
function getClientHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Helpdesk — AI-Powered Support</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace']
          },
          colors: {
            border: "hsl(var(--border))",
            input: "hsl(var(--input))",
            ring: "hsl(var(--ring))",
            background: "hsl(var(--background))",
            foreground: "hsl(var(--foreground))",
            primary: {
              DEFAULT: "hsl(var(--primary))",
              foreground: "hsl(var(--primary-foreground))",
            },
            secondary: {
              DEFAULT: "hsl(var(--secondary))",
              foreground: "hsl(var(--secondary-foreground))",
            },
            destructive: {
              DEFAULT: "hsl(var(--destructive))",
              foreground: "hsl(var(--destructive-foreground))",
            },
            muted: {
              DEFAULT: "hsl(var(--muted))",
              foreground: "hsl(var(--muted-foreground))",
            },
            accent: {
              DEFAULT: "hsl(var(--accent))",
              foreground: "hsl(var(--accent-foreground))",
            },
            popover: {
              DEFAULT: "hsl(var(--popover))",
              foreground: "hsl(var(--popover-foreground))",
            },
            card: {
              DEFAULT: "hsl(var(--card))",
              foreground: "hsl(var(--card-foreground))",
            },
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)",
          }
        }
      }
    }
  </script>
  <style>
    /* shadcn default theme (Zinc/Neutral base) */
    :root {
      --background: 0 0% 100%;
      --foreground: 240 10% 3.9%;
      --card: 0 0% 100%;
      --card-foreground: 240 10% 3.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 240 10% 3.9%;
      --primary: 240 5.9% 10%;
      --primary-foreground: 0 0% 98%;
      --secondary: 240 4.8% 95.9%;
      --secondary-foreground: 240 5.9% 10%;
      --muted: 240 4.8% 95.9%;
      --muted-foreground: 240 3.8% 46.1%;
      --accent: 240 4.8% 95.9%;
      --accent-foreground: 240 5.9% 10%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 98%;
      --border: 240 5.9% 90%;
      --input: 240 5.9% 90%;
      --ring: 240 5.9% 10%;
      --radius: 0.5rem;
    }
    .dark {
      --background: 240 10% 3.9%;
      --foreground: 0 0% 98%;
      --card: 240 10% 3.9%;
      --card-foreground: 0 0% 98%;
      --popover: 240 10% 3.9%;
      --popover-foreground: 0 0% 98%;
      --primary: 0 0% 98%;
      --primary-foreground: 240 5.9% 10%;
      --secondary: 240 3.7% 15.9%;
      --secondary-foreground: 0 0% 98%;
      --muted: 240 3.7% 15.9%;
      --muted-foreground: 240 5% 64.9%;
      --accent: 240 3.7% 15.9%;
      --accent-foreground: 0 0% 98%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 0 0% 98%;
      --border: 240 3.7% 15.9%;
      --input: 240 3.7% 15.9%;
      --ring: 240 4.9% 83.9%;
    }
    * {
      border-color: hsl(var(--border));
    }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.12.7/Recharts.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-background text-foreground min-h-screen transition-colors antialiased">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useMemo } = React;
    const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = window.Recharts || {};

    function CategoryBadge({ category }) {
      const styles = {
        technical_question: "bg-secondary text-secondary-foreground border border-border",
        refund_request: "bg-secondary text-secondary-foreground border border-border",
        general_question: "bg-secondary text-secondary-foreground border border-border"
      };
      const labels = {
        technical_question: "Technical",
        refund_request: "Refund Request",
        general_question: "General Inquiry"
      };
      return (
        <span className={"px-2.5 py-0.5 rounded-full text-xs font-medium border " + (styles[category] || "bg-secondary text-secondary-foreground border-border")}>
          {labels[category] || category}
        </span>
      );
    }

    function StatusBadge({ status }) {
      const styles = {
        open: "bg-secondary text-foreground border border-border",
        resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
        closed: "bg-muted text-muted-foreground border border-border",
        new: "bg-secondary text-foreground border border-border"
      };
      return (
        <span className={"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border " + (styles[status] || "")}>
          <span className={"w-1.5 h-1.5 rounded-full " + (status === 'open' ? 'bg-primary' : status === 'resolved' ? 'bg-emerald-500' : 'bg-muted-foreground')}></span>
          {status}
        </span>
      );
    }

    function LoginForm({ onLogin, theme, toggleTheme }) {
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [fieldErrors, setFieldErrors] = useState({});
      const [serverError, setServerError] = useState("");
      const [loading, setLoading] = useState(false);

      const validateForm = () => {
        const errs = {};
        const emailTrim = (email || "").trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailTrim) {
          errs.email = "Email is required";
        } else if (!emailRegex.test(emailTrim)) {
          errs.email = "Please enter a valid email";
        }

        if (!password) {
          errs.password = "Password is required";
        }

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");
        if (!validateForm()) {
          return;
        }

        setLoading(true);
        try {
          const res = await fetch('/api/auth/sign-in/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password })
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            const msg = data.error?.message || data.error || data.message || "Invalid email or password";
            setServerError(msg);
          } else {
            onLogin(data.user);
          }
        } catch (err) {
          setServerError("Network error while connecting to auth server");
        } finally {
          setLoading(false);
        }
      };

      const fillDemo = () => {
        setEmail("admin@example.com");
        setPassword("AdminPassword123!");
        setFieldErrors({});
        setServerError("");
      };

      return (
        <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background text-foreground transition-colors font-sans">
          <div className="absolute top-6 right-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>

          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-sm mb-3">
                H
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your credentials to continue to Helpdesk
              </p>
            </div>

            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm">
              {serverError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="admin@example.com"
                    aria-invalid={!!fieldErrors.email}
                    className={"flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 " + (fieldErrors.email ? 'border-destructive focus-visible:ring-destructive text-foreground' : 'border-input focus-visible:ring-ring text-foreground')}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none text-foreground">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••••••"
                    aria-invalid={!!fieldErrors.password}
                    className={"flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 " + (fieldErrors.password ? 'border-destructive focus-visible:ring-destructive text-foreground' : 'border-input focus-visible:ring-ring text-foreground')}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 mt-2 cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <span>Signing in...</span>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-[11px] text-muted-foreground text-center mb-2 font-medium">Demo Account (Click to auto-fill):</p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="w-full inline-flex items-center justify-center rounded-md text-xs font-mono transition-colors border border-input bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-8 px-3 cursor-pointer"
                >
                  admin@example.com / AdminPassword123!
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function HelpdeskApp() {
      // Require login first whenever opening the website
      const [currentUser, setCurrentUser] = useState(null);
      const [view, setView] = useState("dashboard"); // "dashboard" | "tickets" | "ticket-detail" | "users"
      const [tickets, setTickets] = useState([]);
      const [stats, setStats] = useState(null);
      const [volume, setVolume] = useState([]);
      const [agentsList, setAgentsList] = useState([]);
      const [selectedTicketId, setSelectedTicketId] = useState(null);
      const [searchQuery, setSearchQuery] = useState("");
      const [statusFilter, setStatusFilter] = useState("all");
      const [categoryFilter, setCategoryFilter] = useState("all");
      const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
      const [replyText, setReplyText] = useState("");
      const [isGeneratingAI, setIsGeneratingAI] = useState(false);

      useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
      }, [theme]);

      const refreshData = async () => {
        try {
          const [tRes, sRes, vRes, aRes] = await Promise.all([
            fetch('/api/tickets').then(r => r.json()),
            fetch('/api/tickets/stats').then(r => r.json()),
            fetch('/api/tickets/stats/daily-volume').then(r => r.json()),
            fetch('/api/agents').then(r => r.json())
          ]);
          setTickets(tRes.tickets || []);
          setStats(sRes);
          setVolume(vRes.data || []);
          setAgentsList(aRes || []);
        } catch (e) {
          console.error("Error loading data", e);
        }
      };

      useEffect(() => {
        refreshData();
      }, []);

      const handleLogout = async () => {
        try {
          await fetch('/api/auth/sign-out', { method: 'POST' });
        } catch (e) {}
        localStorage.removeItem('helpdesk_user');
        setCurrentUser(null);
      };

      const activeTicket = useMemo(() => {
        return tickets.find(t => t.id === selectedTicketId) || tickets[0];
      }, [tickets, selectedTicketId]);

      const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
          const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
          const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
          const matchesSearch = !searchQuery.trim() || 
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.senderName.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesStatus && matchesCat && matchesSearch;
        });
      }, [tickets, statusFilter, categoryFilter, searchQuery]);

      if (!currentUser) {
        return (
          <LoginForm
            onLogin={(user) => {
              setCurrentUser(user);
              localStorage.setItem('helpdesk_user', JSON.stringify(user));
            }}
            theme={theme}
            toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        );
      }

      const handleStatusChange = async (id, newStatus) => {
        await fetch('/api/tickets/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        refreshData();
      };

      const handleAssigneeChange = async (id, newAgentId) => {
        await fetch('/api/tickets/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedToId: newAgentId })
        });
        refreshData();
      };

      const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !activeTicket) return;
        await fetch('/api/tickets/' + activeTicket.id + '/replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: replyText })
        });
        setReplyText("");
        refreshData();
      };

      const handleAISuggest = async () => {
        setIsGeneratingAI(true);
        try {
          const res = await fetch('/api/tickets/' + activeTicket.id + '/ai-reply', { method: 'POST' });
          const data = await res.json();
          setReplyText(data.reply);
        } catch (e) {
          setReplyText("Hello! Thank you for reaching out. We have reviewed your request and are taking care of it immediately.");
        } finally {
          setIsGeneratingAI(false);
        }
      };

      return (
        <div className="flex flex-col min-h-screen">
          {/* TOP NAVBAR - shadcn UI Default Theme */}
          <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
                  <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-sm">
                    H
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-sm tracking-tight text-foreground">Helpdesk</span>
                    <span className="text-[10px] font-medium text-muted-foreground ml-1.5 px-1.5 py-0.5 rounded bg-secondary border border-border">AI</span>
                  </div>
                </div>

                <nav className="hidden md:flex items-center gap-1">
                  <button 
                    onClick={() => setView('dashboard')}
                    className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " + (view === 'dashboard' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => setView('tickets')}
                    className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 " + (view === 'tickets' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >
                    <span>Tickets</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-mono">
                      {tickets.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setView('users')}
                    className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " + (view === 'users' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >
                    Users
                  </button>
                </nav>
              </div>

              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8 text-xs transition-colors cursor-pointer"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {/* Profile Pill & Logout */}
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <div className="w-7 h-7 rounded-full bg-secondary text-foreground border border-border font-medium flex items-center justify-center text-xs">
                    {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left mr-1">
                    <p className="text-xs font-medium text-foreground leading-tight">{currentUser.name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">{currentUser.role || 'Agent'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background shadow-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 h-8 px-2.5 transition-colors cursor-pointer"
                    title="Sign out of Helpdesk"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* VIEW 1: DASHBOARD */}
            {view === 'dashboard' && stats && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Support Overview</h1>
                    <p className="text-sm text-muted-foreground mt-1">Real-time stats and automated ticket routing metrics</p>
                  </div>
                  <button 
                    onClick={() => setView('tickets')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    <span>View All Tickets</span> →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tickets</p>
                    <p className="text-2xl font-bold mt-2 text-foreground tracking-tight">{stats.totalTickets}</p>
                    <p className="text-xs text-muted-foreground mt-1">All recorded inquiries</p>
                  </div>
                  <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Open Tickets</p>
                    <p className="text-2xl font-bold mt-2 text-foreground tracking-tight">{stats.openTickets}</p>
                    <p className="text-xs text-muted-foreground mt-1">Requires agent response</p>
                  </div>
                  <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved by AI</p>
                    <p className="text-2xl font-bold mt-2 text-foreground tracking-tight">{stats.resolvedByAI}</p>
                    <p className="text-xs text-muted-foreground mt-1">Zero human intervention</p>
                  </div>
                  <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Resolution Rate</p>
                    <p className="text-2xl font-bold mt-2 text-foreground tracking-tight">{stats.aiResolutionRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Average handling time: ~1.2 hrs</p>
                  </div>
                </div>

                <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Daily Ticket Volume</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Inbound customer emails received per day</p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                      Last 7 Days
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    {ResponsiveContainer && volume.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volume}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))', fontSize: '12px' }} />
                          <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading metrics...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: TICKETS LIST */}
            {view === 'tickets' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Support Tickets</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage, filter, and respond to incoming customer inquiries</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by subject, email or sender..."
                    className="flex-1 min-w-[240px] px-3 py-1.5 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-background border border-input rounded-md text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-background border border-input rounded-md text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All Categories</option>
                    <option value="technical_question">Technical</option>
                    <option value="refund_request">Refund Request</option>
                    <option value="general_question">General Inquiry</option>
                  </select>
                </div>

                <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted/40">
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Sender</th>
                        <th className="py-3 px-4">Assigned Agent</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-muted-foreground">No tickets match your filters.</td>
                        </tr>
                      ) : (
                        filteredTickets.map(t => (
                          <tr 
                            key={t.id} 
                            onClick={() => { setSelectedTicketId(t.id); setView('ticket-detail'); }}
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                              #{t.id} {t.subject}
                            </td>
                            <td className="py-3.5 px-4"><StatusBadge status={t.status} /></td>
                            <td className="py-3.5 px-4"><CategoryBadge category={t.category} /></td>
                            <td className="py-3.5 px-4 text-muted-foreground">{t.senderName}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{t.assignedTo ? t.assignedTo.name : "Unassigned"}</td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-xs font-medium text-foreground hover:underline">
                                View Detail →
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: TICKET DETAIL */}
            {view === 'ticket-detail' && activeTicket && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setView('tickets')}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  ← Back to all tickets
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={activeTicket.status} />
                          <CategoryBadge category={activeTicket.category} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">#{activeTicket.id}</span>
                      </div>

                      <h1 className="text-xl font-semibold text-foreground tracking-tight">{activeTicket.subject}</h1>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pb-3 border-b border-border">
                        <span>From: <strong>{activeTicket.senderName}</strong> &lt;{activeTicket.senderEmail}&gt;</span>
                        <span>•</span>
                        <span>{new Date(activeTicket.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                        {activeTicket.body}
                      </div>
                    </div>

                    {activeTicket.aiSummary && (
                      <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                          <span>✨ AI Summary & Context</span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {activeTicket.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* Replies */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activity & Responses</h3>
                      {activeTicket.replies && activeTicket.replies.length > 0 ? (
                        activeTicket.replies.map(r => (
                          <div 
                            key={r.id} 
                            className={"p-4 rounded-xl border " + (r.senderType === 'agent' ? 'bg-secondary/40 border-border ml-4' : 'bg-card border-border')}
                          >
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                {r.senderType === 'agent' ? '👨‍💻 ' + (r.user?.name || 'Agent') : '👤 Customer'}
                              </span>
                              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="text-sm whitespace-pre-line text-foreground">
                              {r.body}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No replies yet.</p>
                      )}
                    </div>

                    {/* Add Reply Box with AI Suggest */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Compose Customer Reply</h3>
                        <button
                          type="button"
                          onClick={handleAISuggest}
                          disabled={isGeneratingAI}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground transition-colors cursor-pointer"
                        >
                          {isGeneratingAI ? "Generating suggestion..." : "✨ AI Suggest Reply"}
                        </button>
                      </div>

                      <form onSubmit={handleSendReply} className="space-y-3">
                        <textarea
                          rows="4"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your response here..."
                          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          required
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 cursor-pointer"
                          >
                            Send Reply →
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Ticket Actions */}
                  <div className="space-y-5">
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-4">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Update Ticket</h3>

                      <div>
                        <label className="text-xs font-medium block mb-1.5 text-foreground">Status</label>
                        <select
                          value={activeTicket.status}
                          onChange={(e) => handleStatusChange(activeTicket.id, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring capitalize"
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium block mb-1.5 text-foreground">Assigned Agent</label>
                        <select
                          value={activeTicket.assignedToId || ""}
                          onChange={(e) => handleAssigneeChange(activeTicket.id, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-background border border-input rounded-md text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">Unassigned</option>
                          {agentsList.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: USERS / AGENTS */}
            {view === 'users' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team Members</h1>
                  <p className="text-sm text-muted-foreground mt-1">Manage agent permissions and support team members</p>
                </div>

                <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted/40">
                        <th className="py-3 px-4">Agent Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {(agentsList && agentsList.length > 0 ? agentsList : [
                        { id: "user_admin", name: "Mosh Hamedani", email: "admin@example.com", role: "admin" },
                        { id: "user_agent_1", name: "Sarah Connor", email: "sarah@helpdesk.local", role: "agent" },
                        { id: "user_agent_2", name: "John Doe", email: "john@helpdesk.local", role: "agent" },
                        { id: "user_ai", name: "AI Agent", email: "ai@helpdesk.local", role: "agent" }
                      ]).map(a => (
                        <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-foreground flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-secondary text-foreground border border-border font-medium flex items-center justify-center text-xs">
                              {a.name ? a.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                            </div>
                            <span>{a.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">{a.email}</td>
                          <td className="py-3.5 px-4">
                            <span className={"text-xs px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wider border " + (a.role === 'admin' ? 'bg-secondary text-foreground border-border' : 'bg-muted text-muted-foreground border-border')}>
                              {a.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<HelpdeskApp />);
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEDICATED DATABASE STUDIO (URL: http://localhost:3000/database or /db)
// ─────────────────────────────────────────────────────────────────────────────
function getDatabaseStudioHTML() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PostgreSQL Database Studio — Helpdesk</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace']
          }
        }
      }
    }
  </script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen font-sans">
  <div id="root"></div>

  <script type="text/babel">
    const { useState } = React;

    const dbData = {
      users: ${JSON.stringify(agents)},
      tickets: ${JSON.stringify(tickets)},
      replies: ${JSON.stringify(tickets.flatMap(t => (t.replies || []).map(r => ({ ...r, ticketId: t.id }))))},
      sessions: [
        { id: "sess_prod_auth_token_01", token: "sess_4xl59a57kzr", userId: "user_admin", userEmail: "admin@example.com", expiresAt: "2026-11-25 14:00:00", status: "active" }
      ],
      accounts: [
        { id: "acc_admin_01", providerId: "credential", accountId: "admin@example.com", userId: "user_admin", passwordHash: "$2a$12$K1rZ2m8Xv3LpQ9n0o1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6..." }
      ]
    };

    function DatabaseStudio() {
      const [currentTable, setCurrentTable] = useState('users');
      const [searchQuery, setSearchQuery] = useState('');

      const tables = [
        { name: 'users', count: dbData.users.length, icon: '👤', desc: 'Agent and admin records' },
        { name: 'tickets', count: dbData.tickets.length, icon: '🎫', desc: 'Customer support tickets' },
        { name: 'replies', count: dbData.replies.length, icon: '💬', desc: 'Ticket reply thread records' },
        { name: 'sessions', count: dbData.sessions.length, icon: '🔑', desc: 'Better Auth database sessions' },
        { name: 'accounts', count: dbData.accounts.length, icon: '🛡️', desc: 'User credential credentials' }
      ];

      const rawRows = dbData[currentTable] || [];
      const filteredRows = rawRows.filter(r => {
        if (!searchQuery.trim()) return true;
        return JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase());
      });

      return (
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-slate-800 bg-[#0c1222]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-500/20">
                🐘
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-extrabold tracking-tight">PostgreSQL Database Studio</h1>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    localhost:5432 / helpdesk
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">schema: public • Better Auth + Prisma 7 ORM</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a 
                href="/"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <span>← Back to Helpdesk App</span>
              </a>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Sidebar Table List */}
            <aside className="w-full md:w-64 border-r border-slate-800 bg-[#0c1222]/50 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">Tables ({tables.length})</p>
              {tables.map(t => (
                <button
                  key={t.name}
                  onClick={() => { setCurrentTable(t.name); setSearchQuery(''); }}
                  className={\`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer \${
                    currentTable === t.name 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-bold' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }\`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{t.icon}</span>
                    <span className="font-mono">{t.name}</span>
                  </div>
                  <span className={\`text-[10px] font-mono px-2 py-0.5 rounded-full \${
                    currentTable === t.name ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                  }\`}>
                    {t.count}
                  </span>
                </button>
              ))}

              <div className="pt-6 mt-6 border-t border-slate-800/80 px-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">PostgreSQL Details</p>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>Host: <span className="text-slate-200">127.0.0.1</span></div>
                  <div>Port: <span className="text-slate-200">5432</span></div>
                  <div>Database: <span className="text-slate-200">helpdesk</span></div>
                  <div>Driver: <span className="text-emerald-400">@prisma/adapter-pg</span></div>
                </div>
              </div>
            </aside>

            {/* Table Content Area */}
            <main className="flex-1 p-6 space-y-4 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                    <span>Table:</span>
                    <span className="text-indigo-400 font-extrabold">{currentTable}</span>
                    <span className="text-xs font-normal text-slate-500 font-sans">({filteredRows.length} records)</span>
                  </h2>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={\`Search \${currentTable}...\`}
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Table Data Grid */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0c1222]/80 shadow-xl">
                {filteredRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No records found.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 font-mono uppercase text-slate-400 text-[11px]">
                        {Object.keys(filteredRows[0] || {}).map(col => (
                          <th key={col} className="py-3 px-4 font-bold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          {Object.keys(row).map(col => {
                            const val = row[col];
                            const isObj = typeof val === 'object' && val !== null;
                            return (
                              <td key={col} className="py-3 px-4 text-slate-300 max-w-xs truncate">
                                {isObj ? (
                                  <span className="text-indigo-400 font-sans text-[11px]">{JSON.stringify(val)}</span>
                                ) : (
                                  String(val ?? 'null')
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </main>
          </div>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<DatabaseStudio />);
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HTTP SERVER & ROUTES
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // Enable CORS with Origin reflection & credentials support
  const reqOrigin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API: Health
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // API: Better Auth Sign-In
  if (pathname === '/api/auth/sign-in/email' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body || '{}');
        const cleanEmail = (email || '').trim().toLowerCase();
        
        // Exact credential verification
        const validCredentials = {
          "admin@example.com": "AdminPassword123!",
          "sarah@helpdesk.local": "password123",
          "john@helpdesk.local": "password123"
        };
        
        const expectedPassword = validCredentials[cleanEmail];
        let authenticatedUser = null;

        if (expectedPassword && expectedPassword === password) {
          authenticatedUser = agents.find(a => a.email.toLowerCase() === cleanEmail) || agents[0];
        }

        if (!authenticatedUser) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: { message: "Invalid email or password", status: 401 },
            message: "Invalid email or password" 
          }));
          return;
        }

        const token = 'sess_' + Math.random().toString(36).substring(2);
        dbSessions.set(token, authenticatedUser);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': 'better-auth.session_token=' + token + '; Path=/; HttpOnly'
        });
        res.end(JSON.stringify({ user: authenticatedUser, session: { token, userId: authenticatedUser.id } }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid request payload" }));
      }
    });
    return;
  }

  // API: Better Auth Sign-Out
  if (pathname === '/api/auth/sign-out' && method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // API: Better Auth Get Session
  if (pathname === '/api/auth/get-session' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ session: null, user: null }));
    return;
  }

  // API: /api/me
  if (pathname === '/api/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: agents[0] }));
    return;
  }

  // API: Stats
  if (pathname === '/api/tickets/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStats()));
    return;
  }

  // API: Daily Volume
  if (pathname === '/api/tickets/stats/daily-volume') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: getDailyVolume() }));
    return;
  }

  // API: Agents & Users
  if (pathname === '/api/agents' || pathname === '/api/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(agents));
    return;
  }

  // API: GET /api/tickets
  if (pathname === '/api/tickets' && method === 'GET') {
    let result = [...tickets];
    const { status, category, search } = parsed.query;
    if (status && status !== 'all') {
      result = result.filter(t => t.status === status);
    }
    if (category && category !== 'all') {
      result = result.filter(t => t.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.subject.toLowerCase().includes(q) || t.senderEmail.toLowerCase().includes(q));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tickets: result, total: result.length }));
    return;
  }

  // API: /api/tickets/:id
  const ticketIdMatch = pathname.match(/^\/api\/tickets\/(\d+)$/);
  if (ticketIdMatch) {
    const ticketId = parseInt(ticketIdMatch[1], 10);
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Ticket not found" }));
      return;
    }

    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ticket));
      return;
    }

    if (method === 'PATCH') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const updates = JSON.parse(body);
          if (updates.status) ticket.status = updates.status;
          if (updates.assignedToId !== undefined) {
            ticket.assignedToId = updates.assignedToId;
            ticket.assignedTo = agents.find(a => a.id === updates.assignedToId) || null;
          }
          ticket.updatedAt = new Date().toISOString();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(ticket));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }
  }

  // API: /api/tickets/:id/replies
  const replyMatch = pathname.match(/^\/api\/tickets\/(\d+)\/replies$/);
  if (replyMatch && method === 'POST') {
    const ticketId = parseInt(replyMatch[1], 10);
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Ticket not found" }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const newReply = {
          id: Date.now(),
          senderType: "agent",
          body: payload.body,
          user: agents[0],
          createdAt: new Date().toISOString()
        };
        ticket.replies.push(newReply);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newReply));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // API: AI Reply
  const aiReplyMatch = pathname.match(/^\/api\/tickets\/(\d+)\/ai-reply$/);
  if (aiReplyMatch && method === 'POST') {
    const ticketId = parseInt(aiReplyMatch[1], 10);
    const ticket = tickets.find(t => t.id === ticketId);
    let suggestion = "Hello, thank you for contacting Helpdesk support. We are looking into this for you.";
    if (ticket) {
      if (ticket.category === 'technical_question') {
        suggestion = "Hi " + ticket.senderName + ",\n\nRegarding your issue with \"" + ticket.subject + "\":\n\nPlease check that your connection credentials in .env are correct and ensure your PostgreSQL database service is currently active. If you continue to see connection refused errors, please share your error trace.\n\nBest regards,\nHelpdesk Support Team";
      } else if (ticket.category === 'refund_request') {
        suggestion = "Hi " + ticket.senderName + ",\n\nThank you for reaching out regarding your refund request for \"" + ticket.subject + "\".\n\nWe have verified your account and our billing team has initiated the refund process. You should see the credit on your bank statement within 3 to 5 business days.\n\nSincerely,\nHelpdesk Billing Team";
      } else {
        suggestion = "Hi " + ticket.senderName + ",\n\nThank you for inquiring about \"" + ticket.subject + "\".\n\nYou can configure custom webhooks directly inside the admin console under Settings > Webhooks > Inbound Email. Let us know if you need any additional assistance!\n\nBest,\nHelpdesk Support";
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: suggestion }));
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEDICATED DATABASE ROUTE: http://localhost:3000/database or /db
  // ─────────────────────────────────────────────────────────────────────────
  if (pathname === '/database' || pathname === '/db') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getDatabaseStudioHTML());
    return;
  }

  // DEFAULT: Helpdesk Web App (Login -> Dashboard | Tickets | Users)
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getClientHTML());
});

server.listen(PORT, () => {
  console.log("==================================================");
  console.log("⚡ Helpdesk App is running successfully!");
  console.log("👉 Open in browser: http://localhost:" + PORT);
  console.log("🗄️ Database Studio: http://localhost:" + PORT + "/database");
  console.log("==================================================");
});
