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
      { name: 'Multi-file workspace', done: false },
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
      { name: 'Horizontal scaling via Redis pub/sub', done: false },
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
      { name: 'Deterministic user colors (hash-based)', done: true },
    ],
  },
  {
    number: '06',
    title: 'Code Execution',
    status: 'upcoming',
    date: 'Coming soon',
    icon: <Terminal className="h-5 w-5" />,
    accentColor: '#32D74B',
    features: [
      { name: 'Run code in isolated sandboxes (Judge0)', done: false },
      { name: '60+ languages supported', done: false },
      { name: 'Async execution queue (BullMQ)', done: false },
      {
        name: 'Shared output panel — all collaborators see results',
        done: false,
      },
      { name: 'Rate limiting (10 runs/user/minute)', done: false },
      { name: 'Execution history log', done: false },
    ],
  },
  {
    number: '07',
    title: 'AI Completions',
    status: 'planned',
    date: 'Planned',
    icon: <Sparkles className="h-5 w-5" />,
    accentColor: '#BF5AF2',
    features: [
      { name: 'Inline suggestions (Mistral Codestral)', done: false },
      { name: 'Tab to accept, Escape to dismiss', done: false },
      { name: 'Context-aware completions', done: false },
      { name: 'Multi-line ghost text', done: false },
    ],
  },
  {
    number: '08',
    title: 'Version History',
    status: 'planned',
    date: 'Planned',
    icon: <Clock className="h-5 w-5" />,
    accentColor: '#FF9F0A',
    features: [
      { name: 'Timeline of all document changes', done: false },
      { name: 'Per-user attribution', done: false },
      { name: 'Restore to any previous version', done: false },
      { name: 'Diff viewer', done: false },
    ],
  },
  {
    number: '09',
    title: 'Chat & Stretch Goals',
    status: 'planned',
    date: 'Planned',
    icon: <MessageSquare className="h-5 w-5" />,
    accentColor: '#06B6D4',
    features: [
      { name: 'In-session room chat', done: false },
      { name: 'Code snippet sharing in chat', done: false },
      { name: 'Export to GitHub Gist', done: false },
      { name: 'Mobile-responsive layout', done: false },
      { name: 'Vim / Emacs keybinding modes', done: false },
    ],
  },
]

const statusConfig = {
  shipped: { label: 'Shipped', color: '#32D74B', bg: 'rgba(50,215,75,0.10)' },
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
          Start building with Phase 1–5 today
        </h2>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--coder-text-secondary)',
            marginBottom: '24px',
          }}
        >
          Full CRDT collaboration, presence, and Monaco Editor — available now,
          free.
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
