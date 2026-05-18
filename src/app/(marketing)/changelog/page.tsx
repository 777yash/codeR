const releases = [
  {
    phase: '05',
    title: 'Presence & Awareness',
    date: 'May 17, 2026',
    status: 'latest',
    accentColor: '#FF2D55',
    summary:
      'Colored remote cursors, join/leave toasts, and a live collaborator sidebar.',
    changes: [
      {
        type: 'feature',
        items: [
          'Colored remote cursors with floating name labels via y-monaco + CSS injection',
          'Text selection highlighting per remote user (RGBA wash)',
          'Join/leave toast notifications — fires on WebSocket awareness events',
          'Live collaborator sidebar (Users tab) with role badges and online status',
          'Deterministic user colors via userId hash → HSL (matches cursor + sidebar)',
        ],
      },
      {
        type: 'fix',
        items: [
          'Cursor name label no longer clips above viewport on lines 1–2 (injected `top: 1.4em` for top lines)',
          'Live badge plural string fixed: "1 user" / "2 users"',
          'useCallback dependency array now includes userName (was stale closure)',
        ],
      },
      {
        type: 'infra',
        items: [
          'CollabWarmup component pre-warms collab-server HTTP on dashboard load (avoids Render cold start delay)',
        ],
      },
    ],
  },
  {
    phase: '04',
    title: 'Real-Time Collaboration (CRDT)',
    date: 'May 8, 2026',
    status: 'shipped',
    accentColor: '#32D74B',
    summary:
      'Full Yjs CRDT sync via y-websocket, with snapshot persistence to PostgreSQL.',
    changes: [
      {
        type: 'feature',
        items: [
          'Yjs Y.Doc CRDT document — conflict-free multi-user edits',
          'y-websocket client (v3) connecting to dedicated collab-server (Node.js)',
          'y-monaco binding — Monaco editor wired to Yjs text type',
          'collab-server deployed on Render with y-websocket v2 server utilities',
          'Snapshot persistence: `bindState` loads from DB on first join, `writeState` saves on last leave',
          'Periodic 30s snapshot saves via `setContentInitializor` interval',
        ],
      },
      {
        type: 'fix',
        items: [
          'All Yjs imports are dynamic (inside `handleEditorMount`) — static import breaks SSR/webpack via y-monaco → monaco-editor',
          'Cast `doc.name` as `Y.Doc & { name: string }` — not in official types but set by y-websocket at runtime',
          'Snapshot PUT: wrap `Uint8Array` in `Buffer.from()` for fetch body compatibility',
        ],
      },
      {
        type: 'infra',
        items: [
          'collab-server: separate Node.js process, deployed to Render (`https://code-r-collab-server.onrender.com`)',
          'Snapshot API at `/api/rooms/[id]/snapshot` guarded by `x-internal-secret` header',
          'Added `NEXT_PUBLIC_COLLAB_WS_URL` and `NEXTJS_INTERNAL_SECRET` env vars',
        ],
      },
    ],
  },
  {
    phase: '03',
    title: 'Code Editor',
    date: 'May 7, 2026',
    status: 'shipped',
    accentColor: '#FF9F0A',
    summary:
      'Monaco Editor integration with dynamic language selection and the full room editor UI.',
    changes: [
      {
        type: 'feature',
        items: [
          'Monaco Editor (VS Code engine) embedded via @monaco-editor/react',
          'Dynamic language selector — updates syntax highlighting and room language in DB',
          'Full editor layout: file explorer sidebar, editor, right panel (Users/Chat/History tabs), terminal panel',
          'Settings dialog as overlay (no page navigation — avoids WebSocket disconnect)',
          'Share modal with email invite and copy link',
          'Breadcrumb: project name → filename in top bar',
        ],
      },
      {
        type: 'infra',
        items: [
          'EditorWrapper: dynamic import with `ssr: false` — Monaco cannot run server-side',
          'Room settings rendered as slide-in panel over room page (not a separate route)',
        ],
      },
    ],
  },
  {
    phase: '02',
    title: 'Room Management',
    date: 'April 2026',
    status: 'shipped',
    accentColor: '#BF5AF2',
    summary:
      'Full room CRUD, role-based membership, and shareable read-only links.',
    changes: [
      {
        type: 'feature',
        items: [
          'Create, read, update, delete rooms (owner only for destructive ops)',
          'Role-based access: Owner, Editor, Viewer per room',
          'Invite collaborators by email with role assignment',
          'Shareable read-only links via `/share/[token]`',
          'Language badge and live presence count on room cards',
          'Room search and filter tabs (All, Active Now, Recent, Shared)',
          'Mini code preview snippets on dashboard cards',
        ],
      },
      {
        type: 'infra',
        items: [
          'Prisma Room, RoomMember, ShareLink models',
          'API routes: /api/rooms, /api/rooms/[id], /api/rooms/[id]/members, /api/rooms/[id]/invite, /api/rooms/[id]/share',
        ],
      },
    ],
  },
  {
    phase: '01',
    title: 'Authentication',
    date: 'April 2026',
    status: 'shipped',
    accentColor: '#0075DE',
    summary:
      'NextAuth v5 with GitHub OAuth, Google OAuth, and email/password credentials.',
    changes: [
      {
        type: 'feature',
        items: [
          'GitHub OAuth sign-in',
          'Google OAuth sign-in',
          'Email + password sign-up and sign-in (bcryptjs, cost 12)',
          'User profile page (edit display name)',
          'Session via JWT strategy (edge-safe)',
          'Route protection: protected routes redirect to /signin',
        ],
      },
      {
        type: 'infra',
        items: [
          'NextAuth v5 split config: `auth.ts` (Node.js) + `auth.config.ts` (edge-safe)',
          'Next.js 16 middleware → `src/proxy.ts` (renamed from middleware.ts)',
          'Prisma User, Account, Session, VerificationToken models',
          'Password recovery via `PATCH /api/user/profile` (name only; full recovery flow pending)',
        ],
      },
    ],
  },
  {
    phase: '00',
    title: 'Foundation',
    date: 'April 2026',
    status: 'shipped',
    accentColor: '#555555',
    summary:
      'Project scaffolding, CI pipeline, database schema, and design system.',
    changes: [
      {
        type: 'feature',
        items: [
          'Next.js 16 + React 19 project setup',
          'Tailwind CSS v4 + shadcn/ui v4 component library',
          'Prisma 7 with PrismaPg driver adapter (PostgreSQL via Supabase)',
          'Sentry error monitoring integration',
          'Inter + JetBrains Mono fonts via next/font',
          'Editorial Noir (dark) + Digital Stationery (light) design token system',
        ],
      },
      {
        type: 'infra',
        items: [
          'GitHub Actions CI: format:check → lint → type-check → build',
          'Husky v9 pre-commit: ESLint fix + Prettier on staged files',
          'Zod v4 env validation — app crashes on missing vars at startup',
          'Global safety rule: verify npm packages before install',
        ],
      },
    ],
  },
]

const typeConfig = {
  feature: { label: 'Feature', color: '#32D74B', bg: 'rgba(50,215,75,0.10)' },
  fix: { label: 'Fix', color: '#FF9F0A', bg: 'rgba(255,159,10,0.10)' },
  infra: { label: 'Infra', color: '#888888', bg: 'rgba(136,136,136,0.15)' },
}

const statusConfig = {
  latest: { label: 'Latest', color: '#FF2D55', bg: 'rgba(255,45,85,0.12)' },
  shipped: { label: 'Shipped', color: '#32D74B', bg: 'rgba(50,215,75,0.10)' },
}

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '64px' }}>
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--coder-text-primary)',
            marginBottom: '12px',
          }}
        >
          Changelog
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--coder-text-secondary)' }}>
          Phase-by-phase history of everything shipped in codeR.
        </p>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '19px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            backgroundColor: 'var(--coder-border-mid)',
            borderRadius: '9999px',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {releases.map((release) => {
            const sc = statusConfig[release.status as keyof typeof statusConfig]
            return (
              <div
                key={release.phase}
                style={{
                  display: 'flex',
                  gap: '32px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    width: '40px',
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: '4px',
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '9999px',
                      backgroundColor:
                        release.status === 'latest'
                          ? release.accentColor
                          : 'var(--coder-bg-surface)',
                      border: `2px solid ${release.status === 'latest' ? release.accentColor : 'var(--coder-border-mid)'}`,
                      boxShadow:
                        release.status === 'latest'
                          ? `0 0 8px ${release.accentColor}60`
                          : 'none',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Release header */}
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--coder-text-tertiary)',
                        }}
                      >
                        Phase {release.phase}
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
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--coder-text-tertiary)',
                        }}
                      >
                        {release.date}
                      </span>
                    </div>
                    <h2
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'var(--coder-text-primary)',
                        marginBottom: '6px',
                      }}
                    >
                      {release.title}
                    </h2>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'var(--coder-text-secondary)',
                        margin: 0,
                      }}
                    >
                      {release.summary}
                    </p>
                  </div>

                  {/* Change groups */}
                  <div
                    style={{
                      border: '1px solid var(--coder-border)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    {release.changes.map((group, gi) => {
                      const tc =
                        typeConfig[group.type as keyof typeof typeConfig]
                      return (
                        <div
                          key={group.type}
                          style={{
                            borderTop:
                              gi > 0 ? '1px solid var(--coder-border)' : 'none',
                          }}
                        >
                          <div
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'var(--coder-bg-card)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: tc.color,
                                backgroundColor: tc.bg,
                                padding: '1px 8px',
                                borderRadius: '9999px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {tc.label}
                            </span>
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              padding: '8px 16px 12px 16px',
                              listStyle: 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              backgroundColor: 'var(--coder-bg-surface)',
                            }}
                          >
                            {group.items.map((item) => (
                              <li
                                key={item}
                                style={{
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'flex-start',
                                }}
                              >
                                <span
                                  style={{
                                    color: tc.color,
                                    fontSize: '12px',
                                    marginTop: '2px',
                                    flexShrink: 0,
                                  }}
                                >
                                  ›
                                </span>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    color: 'var(--coder-text-secondary)',
                                    fontFamily:
                                      'var(--font-jetbrains-mono), monospace',
                                  }}
                                >
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming */}
      <div
        style={{
          marginTop: '64px',
          border: '1px dashed var(--coder-border-mid)',
          borderRadius: '10px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--coder-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '12px',
          }}
        >
          Up next
        </div>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--coder-text-primary)',
            marginBottom: '8px',
          }}
        >
          Phase 06 — Code Execution
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--coder-text-secondary)',
            maxWidth: '400px',
            margin: '0 auto 20px',
          }}
        >
          Run code in isolated Judge0 sandboxes. All collaborators see the
          output simultaneously via BullMQ + Redis pub/sub.
        </p>
        <a
          href="/features#phase-06"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--coder-text-accent)',
            textDecoration: 'none',
          }}
        >
          See planned features →
        </a>
      </div>
    </div>
  )
}
