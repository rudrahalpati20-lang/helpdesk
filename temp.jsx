
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
        <span className={\`px-2.5 py-0.5 rounded-full text-xs font-medium border \${styles[category] || "bg-secondary text-secondary-foreground border-border"}\`}>
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
        <span className={\`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border \${styles[status] || ""}\`}>
          <span className={\`w-1.5 h-1.5 rounded-full \${status === 'open' ? 'bg-primary' : status === 'resolved' ? 'bg-emerald-500' : 'bg-muted-foreground'}\`}></span>
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
                    className={\`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 \${
                      fieldErrors.email 
                        ? 'border-destructive focus-visible:ring-destructive text-foreground' 
                        : 'border-input focus-visible:ring-ring text-foreground'
                    }\`}
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
                    className={\`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 \${
                      fieldErrors.password 
                        ? 'border-destructive focus-visible:ring-destructive text-foreground' 
                        : 'border-input focus-visible:ring-ring text-foreground'
                    }\`}
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

      const handleStatusChange = async (id, newStatus) => {
        await fetch(\`/api/tickets/\${id}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        refreshData();
      };

      const handleAssigneeChange = async (id, newAgentId) => {
        await fetch(\`/api/tickets/\${id}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedToId: newAgentId })
        });
        refreshData();
      };

      const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !activeTicket) return;
        await fetch(\`/api/tickets/\${activeTicket.id}/replies\`, {
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
          const res = await fetch(\`/api/tickets/\${activeTicket.id}/ai-reply\`, { method: 'POST' });
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
                    className={\`px-3 py-1.5 text-xs font-medium rounded-md transition-colors \${view === 'dashboard' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}\`}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => setView('tickets')}
                    className={\`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 \${view === 'tickets' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}\`}
                  >
                    <span>Tickets</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-mono">
                      {tickets.length}
                    </span>
                  </button>
                  <button 
                    onClick={() => setView('users')}
                    className={\`px-3 py-1.5 text-xs font-medium rounded-md transition-colors \${view === 'users' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}\`}
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
                            className={\`p-4 rounded-xl border \${r.senderType === 'agent' ? 'bg-secondary/40 border-border ml-4' : 'bg-card border-border'}\`}
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
                            <span className={\`text-xs px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wider border \${a.role === 'admin' ? 'bg-secondary text-foreground border-border' : 'bg-muted text-muted-foreground border-border'}\`}>
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
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-xs text-emerald-600 font-semibold">● Active</span>
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
  