import Link from 'next/link'
import { RevealSurface } from '@/components/ui/reveal-surface'
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
  ChevronDown,
  ArrowUpRight,
} from 'lucide-react'

const phases = [
  {
    number: '01',
    title: 'Authentication',
    status: 'shipped',
    date: 'April 2026',
    icon: <Lock className="h-5 w-5" />,
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
    features: [
      { name: 'Monaco Editor (VS Code engine)', done: true },
      { name: '60+ language syntax highlighting', done: true },
      { name: 'Automatic per-file language detection', done: true },
      { name: 'VS Code keyboard shortcuts', done: true },
      { name: 'Line numbers and minimap', done: true },
      { name: 'Multi-file workspace with nested folder tree', done: true },
    ],
  },
  {
    number: '04',
    title: 'Real-Time Collaboration',
    status: 'shipped',
    date: 'May 2026',
    icon: <Zap className="h-5 w-5" />,
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
    features: [
      { name: 'Full security audit (CSP, CSRF, JWT rotation)', done: true },
      { name: 'CSRF enforcement on all mutation endpoints', done: true },
      {
        name: 'Env validation at startup (fail-fast on missing vars)',
        done: true,
      },
      { name: 'Monaco lazy loading + CRDT V2+gzip compression', done: true },
      { name: 'Mobile-responsive layout', done: true },
      { name: 'PostHog analytics', done: true },
      { name: 'Export to GitHub Gist', done: true },
      {
        name: 'Animated slide-in profile / settings / help panels',
        done: true,
      },
      { name: 'In-app help centre with quick start & shortcuts', done: true },
      {
        name: 'Lightweight dashboard surfaces and theme-aware controls',
        done: true,
      },
      { name: 'Theme-matched scrollbars (dark / light)', done: true },
    ],
  },
  {
    number: '11',
    title: 'WebContainers + Live Preview',
    status: 'in_progress',
    date: 'Jun 2026',
    icon: <Globe className="h-5 w-5" />,
    features: [
      { name: 'In-browser Node.js runtime (zero server infra)', done: true },
      { name: 'Virtual terminal via xterm.js', done: true },
      { name: 'Live preview iframe with hot-reload', done: true },
      {
        name: 'Run flow: auto npm install + dev/start from package.json',
        done: true,
      },
      { name: 'Workspace files live-synced into the container', done: true },
      {
        name: 'Save to a local folder — two-way sync + restore on return',
        done: true,
      },
      { name: 'Editor deletions mirror to the linked folder', done: true },
      { name: 'Polyglot rooms — per-file language detection', done: true },
      { name: 'GitHub-style language breakdown bar', done: true },
      { name: 'VS Code-style tabs, file menus & nested tree', done: true },
      { name: 'Delete any file — even the last (reseeds a blank)', done: true },
      { name: 'Cross-browser verification pass', done: false },
    ],
  },
  {
    number: '12',
    title: 'AI Assistant & Scaffolding',
    status: 'shipped',
    date: 'Jun 2026',
    icon: <Bot className="h-5 w-5" />,
    features: [
      {
        name: 'Ask questions — explain & debug code, discuss, research',
        done: true,
      },
      {
        name: 'Build mode: prompt → full runnable project (GroqCloud)',
        done: true,
      },
      {
        name: 'Generates the file tree, code, install & start commands',
        done: true,
      },
      {
        name: 'Auto-applies to the shared workspace and runs in the runtime',
        done: true,
      },
      {
        name: 'Edits existing files in place + deletes on request',
        done: true,
      },
      {
        name: 'Project-aware: reads open files + multi-turn context',
        done: true,
      },
      { name: 'Stop, regenerate & clear (/clear) controls', done: true },
    ],
  },
  {
    number: '13',
    title: '@ai Chat Commands',
    status: 'shipped',
    date: 'Jun 2026',
    icon: <AtSign className="h-5 w-5" />,
    features: [
      {
        name: '@ai in chat triggers AI visible to all collaborators',
        done: true,
      },
      {
        name: 'Explain, fix, refactor & build — the model decides',
        done: true,
      },
      {
        name: '@ai run <command> executes in the in-browser terminal',
        done: true,
      },
      {
        name: 'Generated files sync via CRDT; “Run here” per collaborator',
        done: true,
      },
      {
        name: 'Live “thinking” indicator + attribution; Stop in-flight',
        done: true,
      },
      { name: 'Per-room rate limit (Redis) + audit log', done: true },
      { name: 'Owner can enable/disable AI per room', done: true },
    ],
  },
]

const statusConfig = {
  shipped: 'Shipped',
  in_progress: 'In progress',
  upcoming: 'Upcoming',
  planned: 'Planned',
}

export default function FeaturesPage() {
  return (
    <div className="product-page">
      <header className="product-page-heading">
        <h1>Features</h1>
        <Link href="/signup" className="action-primary">
          Open a workspace <ArrowUpRight size={16} />
        </Link>
      </header>
      <div className="feature-layout">
        <aside className="feature-index" aria-label="Feature navigation">
          {phases.map((phase) => (
            <a key={phase.number} href={`#feature-${phase.number}`}>
              <span>{phase.number}</span>
              {phase.title}
            </a>
          ))}
        </aside>
        <RevealSurface className="feature-sections">
          {phases.map((phase, index) => (
            <details
              key={phase.number}
              id={`feature-${phase.number}`}
              className="feature-section"
              open={index < 2}
              data-reveal
            >
              <summary>
                <span className="feature-number">{phase.number}</span>
                <span className="feature-section-icon">{phase.icon}</span>
                <h2>{phase.title}</h2>
                <span
                  className={
                    phase.status === 'shipped'
                      ? 'status-tag'
                      : 'status-tag status-tag-accent'
                  }
                >
                  {statusConfig[phase.status as keyof typeof statusConfig]}
                </span>
                <ChevronDown size={16} className="feature-chevron" />
              </summary>
              <div className="feature-section-content">
                <ul>
                  {phase.features.map((feature) => (
                    <li
                      key={feature.name}
                      className={feature.done ? undefined : 'is-pending'}
                    >
                      {feature.done ? (
                        <CheckCircle2 size={15} aria-label="Available" />
                      ) : (
                        <Circle size={15} aria-label="Planned" />
                      )}
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </RevealSurface>
      </div>
    </div>
  )
}
