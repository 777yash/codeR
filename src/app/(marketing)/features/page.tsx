import {
  CheckCircle2,
  Circle,
  Users,
  Lock,
  Code2,
  Zap,
  Terminal,
  Sparkles,
  Clock,
  MessageSquare,
  Globe,
  Bot,
  AtSign,
  Wrench,
} from 'lucide-react'

const phases = [
  {
    number: '01',
    title: 'Authentication',
    status: 'shipped',
    date: 'April 2026',
    icon: <Lock className="h-5 w-5" />,
    accentColor: '#FF2D55',
    features: [
      { name: 'GitHub OAuth sign-in', done: true },
      { name: 'Google OAuth sign-in', done: true },
      { name: 'Email + password sign-in', done: true },
      { name: 'Secure session management (JWT)', done: true },
      { name: 'User profile management', done: true },
      { name: 'Password recovery flow', done: false },
    ],
  },
  {
    number: '02',
    title: 'Room Management',
    status: 'shipped',
    date: 'April 2026',
    icon: <Users className="h-5 w-5" />,
    accentColor: '#BF5AF2',
    features: [
      { name: 'Create and join coding rooms', done: true },
      { name: 'Role-based access (Owner, Editor, Viewer)', done: true },
      { name: 'Invite collaborators by email', done: true },
      { name: 'Shareable read-only links', done: true },
      { name: 'Room settings and configuration', done: true },
      { name: 'Room search and filtering', done: true },
    ],
  },
  {
    number: '03',
    title: 'Code Editor',
    status: 'shipped',
    date: 'May 2026',
    icon: <Code2 className="h-5 w-5" />,
    accentColor: '#FF9F0A',
    features: [
      { name: 'Monaco Editor (VS Code engine)', done: true },
      { name: '60+ language syntax highlighting', done: true },
      { name: 'Dynamic language selector', done: true },
      { name: 'VS Code keyboard shortcuts', done: true },
      { name: 'Line numbers and minimap', done: true },
      { name: 'Multi-file workspace', done: true },
    ],
  },
  {
    number: '04',
    title: 'Real-Time Collaboration',
    status: 'shipped',
    date: 'May 2026',
    icon: <Zap className="h-5 w-5" />,
    accentColor: '#32D74B',
    features: [
      { name: 'CRDT-based conflict-free sync (Yjs)', done: true },
      { name: 'WebSocket document synchronization', done: true },
      { name: 'Persistent snapshots (survive server restarts)', done: true },
      { name: 'Offline editing with auto-reconnect', done: true },
      { name: 'Multi-user simultaneous editing', done: true },
      { name: 'Horizontal scaling via Redis pub/sub', done: true },
    ],
  },
  {
    number: '05',
    title: 'Presence & Awareness',
    status: 'shipped',
    date: 'May 2026',
    icon: <Users className="h-5 w-5" />,
    accentColor: '#FF2D55',
    features: [
      { name: 'Colored remote cursors per user', done: true },
      { name: 'Cursor name labels', done: true },
      { name: 'Text selection highlighting', done: true },
      { name: 'Join/leave toast notifications', done: true },
      { name: 'Live collaborator sidebar', done: true },
      { name: 'Consistent user colors across editor and sidebar', done: true },
    ],
  },
  {
    number: '06',
    title: 'Code Execution',
    status: 'shipped',
    date: 'May 2026',
    icon: <Terminal className="h-5 w-5" />,
    accentColor: '#32D74B',
    features: [
      { name: 'Run code via OneCompiler (28 languages)', done: true },
      {
        name: 'Shared output panel — all collaborators see results',
        done: true,
      },
      { name: 'Stdin support for interactive programs', done: true },
      { name: 'Execution history log', done: true },
      {
        name: 'Status badges (running / success / error / timeout)',
        done: true,
      },
      {
        name: 'Multi-file execution (all workspace files sent together)',
        done: true,
      },
      {
        name: 'Terminal toggle — any collaborator can show/hide output',
        done: true,
      },
    ],
  },
  {
    number: '07',
    title: 'Version History',
    status: 'shipped',
    date: 'May 2026',
    icon: <Clock className="h-5 w-5" />,
    accentColor: '#FF9F0A',
    features: [
      { name: 'Auto-snapshots every 30s via collab-server', done: true },
      { name: 'Named versions (user-triggered, any time)', done: true },
      { name: 'Visual diff viewer (Monaco DiffEditor)', done: true },
      { name: 'Named / Auto-saves tabs in history panel', done: true },
      { name: 'Resizable version history panel', done: true },
      { name: 'Per-user attribution on named snapshots', done: true },
      {
        name: 'One-click restore — live clients update instantly',
        done: true,
      },
    ],
  },
  {
    number: '08',
    title: 'Chat',
    status: 'shipped',
    date: 'Jun 2026',
    icon: <MessageSquare className="h-5 w-5" />,
    accentColor: '#06B6D4',
    features: [
      { name: 'In-session room chat via Yjs Y.Array', done: true },
      { name: 'Real-time sync', done: true },
      { name: 'Color-coded by user, auto-scroll', done: true },
      { name: 'Messages persist in Yjs snapshot', done: true },
      { name: 'Code snippet sharing in chat', done: true },
      { name: 'Unread count badge', done: true },
      { name: '@mention support', done: true },
    ],
  },
  {
    number: '09',
    title: 'AI Completions',
    status: 'shipped',
    date: 'Jun 2026',
    icon: <Sparkles className="h-5 w-5" />,
    accentColor: '#BF5AF2',
    features: [
      { name: 'Inline suggestions (Mistral Codestral FIM)', done: true },
      { name: 'Tab to accept, Escape to dismiss', done: true },
      { name: 'Context-aware completions (multi-file)', done: true },
      { name: 'Multi-line ghost text', done: true },
      {
        name: 'Per-user on/off toggle (persisted across sessions)',
        done: true,
      },
    ],
  },
  {
    number: '10',
    title: 'Polish & Security',
    status: 'shipped',
    date: 'Jun 2026',
    icon: <Wrench className="h-5 w-5" />,
    accentColor: '#FF2D55',
    features: [
      { name: 'Full security audit (CSP, CSRF, JWT rotation)', done: true },
      { name: 'CSRF enforcement on all mutation endpoints', done: true },
      {
        name: 'Env validation at startup (fail-fast on missing vars)',
        done: true,
      },
      { name: 'Monaco lazy loading + CRDT V2+gzip compression', done: true },
      { name: 'Mobile-responsive layout', done: true },
      { name: 'PostHog analytics', done: false },
      { name: 'Export to GitHub Gist', done: false },
    ],
  },
  {
    number: '11',
    title: 'WebContainers + Live Preview',
    status: 'planned',
    date: 'Planned',
    icon: <Globe className="h-5 w-5" />,
    accentColor: '#0EA5E9',
    features: [
      { name: 'In-browser Node.js runtime (zero server infra)', done: false },
      { name: 'Virtual terminal via xterm.js', done: false },
      { name: 'Live preview iframe with hot-reload', done: false },
      { name: 'Auto npm install from package.json', done: false },
      { name: 'WebContainer + Monaco VFS bidirectional sync', done: false },
    ],
  },
  {
    number: '12',
    title: 'AI Project Scaffolding',
    status: 'planned',
    date: 'Planned',
    icon: <Bot className="h-5 w-5" />,
    accentColor: '#A855F7',
    features: [
      {
        name: 'Prompt → full runnable project in seconds (Gemini)',
        done: false,
      },
      {
        name: 'AI generates file tree, code, install & start commands',
        done: false,
      },
      { name: 'Multi-file AI editing with diff preview', done: false },
      { name: 'Context-aware edits across all open files', done: false },
      { name: 'Accept / reject per-file before applying', done: false },
    ],
  },
  {
    number: '13',
    title: '@ai Chat Commands',
    status: 'planned',
    date: 'Planned',
    icon: <AtSign className="h-5 w-5" />,
    accentColor: '#F59E0B',
    features: [
      { name: '@ai trigger visible to all room collaborators', done: false },
      { name: 'Fix, explain, refactor, scaffold commands', done: false },
      { name: 'AI-proposed edits applied with one click', done: false },
      { name: 'Rate limited per room (Redis counter)', done: false },
      { name: 'Owner can enable/disable @ai per room', done: false },
    ],
  },
]

const statusConfig = {
  shipped: { label: 'Shipped', color: '#32D74B', bg: 'rgba(50,215,75,0.10)' },
  in_progress: {
    label: 'In Progress',
    color: '#FF9F0A',
    bg: 'rgba(255,159,10,0.10)',
  },
  upcoming: {
    label: 'In Progress',
    color: '#FF9F0A',
    bg: 'rgba(255,159,10,0.10)',
  },
  planned: { label: 'Planned', color: '#555555', bg: 'rgba(85,85,85,0.15)' },
}

export default function FeaturesPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '64px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '72px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '9999px',
            border: '1px solid var(--coder-border-accent)',
            backgroundColor: 'var(--coder-bg-card)',
            padding: '6px 16px',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--coder-text-accent)',
            }}
          >
            Phase roadmap
          </span>
        </div>
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--coder-text-primary)',
            marginBottom: '16px',
          }}
        >
          Everything in codeR
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--coder-text-secondary)',
            maxWidth: '520px',
            margin: '0 auto',
          }}
        >
          Built phase by phase — every feature designed to work together, not
          bolted on.
        </p>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            marginTop: '32px',
            flexWrap: 'wrap',
          }}
        >
          {Object.entries(statusConfig).map(([key, { label, color, bg }]) => (
            <div
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color,
                  backgroundColor: bg,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {phases.map((phase) => {
          const sc = statusConfig[phase.status as keyof typeof statusConfig]
          const doneCount = phase.features.filter((f) => f.done).length
          const totalCount = phase.features.length

          return (
            <div
              key={phase.number}
              style={{
                border: '1px solid var(--coder-border)',
                borderRadius: '10px',
                backgroundColor: 'var(--coder-bg-surface)',
                overflow: 'hidden',
              }}
            >
              {/* Phase header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--coder-border)',
                  backgroundColor: 'var(--coder-bg-card)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: `${phase.accentColor}18`,
                      color: phase.accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {phase.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--coder-text-tertiary)',
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                        }}
                      >
                        Phase {phase.number}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: sc.color,
                          backgroundColor: sc.bg,
                          padding: '1px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <h2
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--coder-text-primary)',
                        margin: '2px 0 0',
                      }}
                    >
                      {phase.title}
                    </h2>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  {/* Progress bar */}
                  {phase.status === 'shipped' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '80px',
                          height: '4px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--coder-border-mid)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(doneCount / totalCount) * 100}%`,
                            height: '100%',
                            backgroundColor: sc.color,
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--coder-text-tertiary)',
                        }}
                      >
                        {doneCount}/{totalCount}
                      </span>
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--coder-text-tertiary)',
                    }}
                  >
                    {phase.date}
                  </span>
                </div>
              </div>

              {/* Features list */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '0',
                  padding: '4px 0',
                }}
              >
                {phase.features.map((feature) => (
                  <div
                    key={feature.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 24px',
                    }}
                  >
                    {feature.done ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0"
                        style={{ color: '#32D74B' }}
                      />
                    ) : (
                      <Circle
                        className="h-4 w-4 shrink-0"
                        style={{ color: 'var(--coder-text-tertiary)' }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '13px',
                        color: feature.done
                          ? 'var(--coder-text-primary)'
                          : 'var(--coder-text-tertiary)',
                      }}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '72px',
          padding: '48px 24px',
          border: '1px solid var(--coder-border)',
          borderRadius: '10px',
          backgroundColor: 'var(--coder-bg-card)',
        }}
      >
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--coder-text-primary)',
            marginBottom: '8px',
          }}
        >
          Start building with Phase 1–10 today
        </h2>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--coder-text-secondary)',
            marginBottom: '24px',
          }}
        >
          CRDT collaboration, AI completions, live code execution, version
          history, presence, and Monaco Editor — available now, free.
        </p>
        <a
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '44px',
            padding: '0 28px',
            borderRadius: '9999px',
            backgroundColor: 'var(--coder-accent)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Create free account
        </a>
      </div>
    </div>
  )
}
