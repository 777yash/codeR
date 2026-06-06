import Link from 'next/link'
import { ArrowRight, Globe, Zap, Lock, Users, Code2 } from 'lucide-react'

const SUPPORTED_LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Go',
  'Rust',
  'Java',
  'C',
  'C++',
  'C#',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Scala',
  'Haskell',
  'Lua',
  'R',
  'Perl',
  'Shell/Bash',
  'SQL',
  'HTML',
  'CSS',
  'JSON',
  'YAML',
  'Markdown',
  'Dockerfile',
  'Terraform',
  'GraphQL',
]

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'S'], description: 'Save (auto-synced — no-op)' },
  { keys: ['Ctrl', 'Z'], description: 'Undo (CRDT-aware)' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', '/'], description: 'Toggle line comment' },
  { keys: ['Alt', 'Shift', 'F'], description: 'Format document' },
  { keys: ['Ctrl', 'D'], description: 'Select next occurrence' },
  { keys: ['Ctrl', 'F'], description: 'Find in file' },
  { keys: ['Ctrl', 'H'], description: 'Find and replace' },
  { keys: ['Ctrl', 'G'], description: 'Go to line' },
  { keys: ['F1'], description: 'Command palette' },
  { keys: ['Tab'], description: 'Accept AI suggestion (when visible)' },
  { keys: ['Escape'], description: 'Dismiss AI suggestion' },
]

function SectionAnchor({ id }: { id: string }) {
  return (
    <span
      id={id}
      style={{
        scrollMarginTop: '80px',
        display: 'block',
        position: 'relative',
        top: '-80px',
      }}
    />
  )
}

function Heading2({
  children,
  id,
}: {
  children: React.ReactNode
  id?: string
}) {
  return (
    <div>
      {id && <SectionAnchor id={id} />}
      <h2
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--coder-text-primary)',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--coder-border)',
        }}
      >
        {children}
      </h2>
    </div>
  )
}

function Heading3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--coder-text-primary)',
        marginBottom: '8px',
        marginTop: '24px',
      }}
    >
      {children}
    </h3>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '14px',
        lineHeight: 1.75,
        color: 'var(--coder-text-secondary)',
        marginBottom: '16px',
      }}
    >
      {children}
    </p>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: '12px',
        backgroundColor: 'var(--coder-bg-card)',
        border: '1px solid var(--coder-border)',
        borderRadius: '4px',
        padding: '1px 5px',
        color: 'var(--coder-accent)',
      }}
    >
      {children}
    </code>
  )
}

function Callout({
  type,
  children,
}: {
  type: 'info' | 'tip' | 'warning'
  children: React.ReactNode
}) {
  const colors = {
    info: {
      border: 'rgba(0,117,222,0.30)',
      bg: 'rgba(0,117,222,0.06)',
      icon: 'ℹ',
      color: '#0075DE',
    },
    tip: {
      border: 'rgba(50,215,75,0.30)',
      bg: 'rgba(50,215,75,0.06)',
      icon: '✦',
      color: '#32D74B',
    },
    warning: {
      border: 'rgba(255,159,10,0.30)',
      bg: 'rgba(255,159,10,0.06)',
      icon: '⚠',
      color: '#FF9F0A',
    },
  }
  const c = colors[type]
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '16px',
      }}
    >
      <span
        style={{
          fontSize: '14px',
          color: c.color,
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        {c.icon}
      </span>
      <p
        style={{
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--coder-text-secondary)',
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  )
}

const navItems = [
  { href: '#overview', label: 'Overview' },
  { href: '#getting-started', label: 'Getting Started' },
  { href: '#rooms', label: 'Rooms' },
  { href: '#editor', label: 'Editor' },
  { href: '#multi-file', label: 'Multi-File Workspace' },
  { href: '#collaboration', label: 'Collaboration' },
  { href: '#sharing', label: 'Sharing' },
  { href: '#keyboard-shortcuts', label: 'Keyboard Shortcuts' },
  { href: '#languages', label: 'Supported Languages' },
  { href: '#mobile', label: 'Mobile' },
  { href: '#api', label: 'API Reference' },
]

export default function DocsPage() {
  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '64px 24px',
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: '48px',
        alignItems: 'start',
      }}
      className="docs-layout"
    >
      <style>{`
        @media (max-width: 768px) {
          .docs-layout { grid-template-columns: 1fr !important; }
          .docs-sidebar { display: none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside
        className="docs-sidebar"
        style={{
          position: 'sticky',
          top: '80px',
          borderRight: '1px solid var(--coder-border)',
          paddingRight: '24px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--coder-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '12px',
          }}
        >
          On this page
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="docs-sidebar-link"
              style={{
                fontSize: '13px',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <article style={{ minWidth: 0 }}>
        {/* Title */}
        <div style={{ marginBottom: '48px' }}>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--coder-text-primary)',
              marginBottom: '12px',
            }}
          >
            Documentation
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--coder-text-secondary)' }}>
            Everything you need to get started with codeR.
          </p>
        </div>

        {/* Overview */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="overview">Overview</Heading2>
          <Prose>
            codeR is a browser-based, real-time collaborative code editor.
            Multiple users can edit the same document simultaneously — changes
            are merged conflict-free using CRDT (Yjs). Every cursor, selection,
            and keystroke is shared instantly across all collaborators.
          </Prose>
          <Prose>
            No install required. Create a room, share the link, and start coding
            together in seconds.
          </Prose>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '20px',
            }}
          >
            {[
              {
                icon: <Zap className="h-4 w-4" />,
                label: 'CRDT sync',
                sub: 'Conflict-free merging',
              },
              {
                icon: <Users className="h-4 w-4" />,
                label: 'Presence',
                sub: 'Live cursors + avatars',
              },
              {
                icon: <Code2 className="h-4 w-4" />,
                label: 'Monaco Editor',
                sub: 'VS Code engine',
              },
              {
                icon: <Lock className="h-4 w-4" />,
                label: 'Auth',
                sub: 'GitHub, Google, email',
              },
              {
                icon: <Globe className="h-4 w-4" />,
                label: '29 languages',
                sub: 'Syntax highlighting + execution',
              },
            ].map(({ icon, label, sub }) => (
              <div
                key={label}
                style={{
                  border: '1px solid var(--coder-border)',
                  borderRadius: '6px',
                  padding: '12px',
                  backgroundColor: 'var(--coder-bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  color: 'var(--coder-accent)',
                }}
              >
                {icon}
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--coder-text-primary)',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--coder-text-tertiary)',
                  }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Getting Started */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="getting-started">Getting Started</Heading2>

          <Heading3>1. Create an account</Heading3>
          <Prose>
            Visit <InlineCode>/signup</InlineCode> and sign up with GitHub,
            Google, or email. OAuth is recommended — one click, no password to
            remember.
          </Prose>

          <Heading3>2. Create your first room</Heading3>
          <Prose>
            From the dashboard, click{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              + New Room
            </strong>
            . Give it a name, choose a primary language, and set visibility
            (private or public). Rooms are private by default — only invited
            members can join.
          </Prose>

          <Heading3>3. Invite collaborators</Heading3>
          <Prose>
            Inside a room, click{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Share
            </strong>{' '}
            in the top bar. Enter email addresses to invite by role (Editor or
            Viewer), or copy the room link to share.
          </Prose>

          <Heading3>4. Start coding</Heading3>
          <Prose>
            The Monaco editor loads immediately. All changes sync in real-time
            across every connected browser. Collaborators appear as colored
            cursors with name labels.
          </Prose>

          <Callout type="tip">
            Sessions persist between browser refreshes. Your code is saved as a
            Yjs snapshot on the server — the document is restored exactly as you
            left it when you rejoin.
          </Callout>
        </section>

        {/* Rooms */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="rooms">Rooms</Heading2>
          <Prose>
            A room is a collaborative workspace. Each room has a unique URL, a
            primary language setting, and a list of members with roles.
          </Prose>

          <Heading3>Roles</Heading3>
          <div
            style={{
              border: '1px solid var(--coder-border)',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            {[
              {
                role: 'Owner',
                color: '#FF2D55',
                perms: 'Full access — edit code, manage members, delete room',
              },
              {
                role: 'Editor',
                color: '#32D74B',
                perms: 'Edit code, use execution, invite others',
              },
              {
                role: 'Viewer',
                color: '#888888',
                perms: 'Read-only — see code, cursors, and chat',
              },
            ].map(({ role, color, perms }, i) => (
              <div
                key={role}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid var(--coder-border)' : 'none',
                  backgroundColor: 'var(--coder-bg-surface)',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color,
                    backgroundColor: `${color}18`,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    minWidth: '56px',
                    textAlign: 'center',
                  }}
                >
                  {role}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--coder-text-secondary)',
                  }}
                >
                  {perms}
                </span>
              </div>
            ))}
          </div>

          <Heading3>Room settings</Heading3>
          <Prose>
            Open settings from inside the room (gear icon or{' '}
            <InlineCode>⌘</InlineCode>, in the top bar). You can rename the
            room, change the primary language, manage members, and rotate the
            share link.
          </Prose>

          <Callout type="info">
            Navigating away from the room page closes the WebSocket connection.
            Other collaborators will see your cursor disappear. Settings and
            share panels open as overlays — they don&apos;t navigate away.
          </Callout>
        </section>

        {/* Editor */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="editor">Editor</Heading2>
          <Prose>
            codeR uses the Monaco Editor — the same engine as VS Code. All
            standard VS Code keyboard shortcuts work out of the box.
          </Prose>

          <Heading3>Language selection</Heading3>
          <Prose>
            The primary language is set per room and controls syntax
            highlighting. You can switch it any time from the language selector
            in the top bar. 29 languages are supported.
          </Prose>

          <Heading3>Auto-save</Heading3>
          <Prose>
            There is no save button. Every keystroke is broadcast via WebSocket
            and merged into the shared CRDT document. The collab server persists
            a compressed Yjs snapshot to the database every 30 seconds (only
            when the document has changed — idle rooms generate no writes). The
            editor state survives server restarts, network interruptions, and
            browser refreshes.
          </Prose>

          <Heading3>Version history</Heading3>
          <Prose>
            codeR automatically saves up to 50 snapshots per room (capped,
            oldest auto-save pruned first). You can also save a named version at
            any time — click the bookmark icon in the room header, optionally
            add a label, and confirm. Named versions are kept indefinitely.
          </Prose>
          <Prose>
            Open the History tab in the collab panel to browse versions. Click
            any entry to open a Monaco DiffEditor comparing that snapshot
            against the current file. Owners and Editors can restore any version
            — all collaborators see the change applied instantly via the live
            Yjs document; no page reload required.
          </Prose>

          <Heading3>Mobile support</Heading3>
          <Prose>
            codeR is fully mobile-responsive. On small screens the editor
            switches to a single-pane layout with a bottom tab bar — tap{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Editor
            </strong>
            ,{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Files
            </strong>
            , or{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Collab
            </strong>{' '}
            to switch between panes. The file explorer and collab panel slide in
            as overlays without disconnecting from the WebSocket session.
          </Prose>

          <Callout type="warning">
            Yjs CRDT sync is browser-only — server-side rendering (SSR) is
            intentionally skipped for the editor component. The editor appears
            after hydration.
          </Callout>
        </section>

        {/* Multi-File Workspace */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="multi-file">Multi-File Workspace</Heading2>
          <Prose>
            Each room supports multiple files. Create, rename, and delete files
            from the file explorer (left sidebar) or the tab bar. The file list
            is synced across all collaborators in real-time — adding a file in
            one browser immediately appears for everyone in the room.
          </Prose>

          <Heading3>Creating files</Heading3>
          <Prose>
            Click the <InlineCode>+</InlineCode> button in the file explorer
            header or tab bar and type a filename. Include an extension (e.g.{' '}
            <InlineCode>utils.ts</InlineCode>) to auto-detect the language.
          </Prose>

          <Heading3>Renaming files</Heading3>
          <Prose>
            Double-click a filename in the file explorer, or right-click and
            choose{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Rename
            </strong>
            . Press <InlineCode>Enter</InlineCode> to confirm or{' '}
            <InlineCode>Escape</InlineCode> to cancel.
          </Prose>

          <Heading3>Deleting files</Heading3>
          <Prose>
            Right-click a file in the explorer and choose{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Delete
            </strong>
            . The last remaining file cannot be deleted.
          </Prose>

          <Heading3>Per-file content sync</Heading3>
          <Prose>
            Each file has its own independent CRDT document (
            <InlineCode>Y.Text</InlineCode>). All collaborators can edit
            different files simultaneously. Switching tabs swaps the Monaco
            model and binds to that file&apos;s Yjs text — undo/redo history is
            per-file.
          </Prose>

          <Callout type="info">
            Running code executes the currently active file. Make sure the
            correct file is in focus before clicking Run.
          </Callout>
        </section>

        {/* Collaboration */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="collaboration">Collaboration</Heading2>

          <Heading3>How sync works</Heading3>
          <Prose>
            codeR uses{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>Yjs</strong>{' '}
            — a CRDT (Conflict-free Replicated Data Type) library. Each client
            holds a full local copy of the document. Edits are represented as
            operations that can be merged in any order without conflicts. No
            central lock is needed.
          </Prose>
          <Prose>
            The collab server (<InlineCode>y-websocket</InlineCode>) relays
            updates between clients and persists snapshots to the database via
            the Next.js API.
          </Prose>

          <Heading3>Remote cursors</Heading3>
          <Prose>
            Each collaborator has a unique color derived from their user ID
            (deterministic hash → HSL). Cursor positions and text selections are
            shared via Yjs awareness protocol — separate from document state, so
            cursor updates don&apos;t affect undo history.
          </Prose>

          <Heading3>Presence panel</Heading3>
          <Prose>
            The Users tab in the right panel shows all connected collaborators
            with their roles and activity status. Join/leave events trigger
            toast notifications.
          </Prose>

          <Heading3>Offline behavior</Heading3>
          <Prose>
            If your connection drops, the editor continues to work locally. Yjs
            buffers your changes. On reconnect, the collab server merges them
            automatically — no conflicts, no data loss.
          </Prose>
        </section>

        {/* Sharing */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="sharing">Sharing</Heading2>

          <Heading3>Invite by email</Heading3>
          <Prose>
            From the Share modal, enter a collaborator&apos;s email and choose
            their role. They&apos;ll appear in the members list immediately and
            can join the room with their codeR account.
          </Prose>

          <Heading3>Share link</Heading3>
          <Prose>
            Copy the room link from the Share modal. Anyone with the link and a
            codeR account can join at the assigned role. Toggle{' '}
            <InlineCode>Allow public read-only access</InlineCode> to let anyone
            view without signing in.
          </Prose>

          <Heading3>Read-only tokens</Heading3>
          <Prose>
            Share links with Viewer role generate a{' '}
            <InlineCode>/share/[token]</InlineCode> URL that can be opened
            without authentication. Useful for sharing code snippets publicly.
          </Prose>
        </section>

        {/* Keyboard Shortcuts */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="keyboard-shortcuts">Keyboard Shortcuts</Heading2>
          <Prose>
            All standard VS Code shortcuts work. Key ones relevant to codeR:
          </Prose>
          <div
            style={{
              border: '1px solid var(--coder-border)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            {KEYBOARD_SHORTCUTS.map(({ keys, description }, i) => (
              <div
                key={description}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderTop: i > 0 ? '1px solid var(--coder-border)' : 'none',
                  backgroundColor: 'var(--coder-bg-surface)',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--coder-text-secondary)',
                  }}
                >
                  {description}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {keys.map((key, ki) => (
                    <span key={ki}>
                      <kbd
                        style={{
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          fontSize: '11px',
                          color: 'var(--coder-text-primary)',
                          backgroundColor: 'var(--coder-bg-card-active)',
                          border: '1px solid var(--coder-border-mid)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                        }}
                      >
                        {key}
                      </kbd>
                      {ki < keys.length - 1 && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--coder-text-tertiary)',
                            margin: '0 2px',
                          }}
                        >
                          +
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Languages */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="languages">Supported Languages</Heading2>
          <Prose>
            29 languages are available in the language selector. Syntax
            highlighting is provided by Monaco; code execution runs via
            OneCompiler — click Run in the top bar to execute.
          </Prose>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <span
                key={lang}
                style={{
                  fontSize: '12px',
                  color: 'var(--coder-text-secondary)',
                  backgroundColor: 'var(--coder-bg-card)',
                  border: '1px solid var(--coder-border)',
                  borderRadius: '4px',
                  padding: '3px 10px',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                {lang}
              </span>
            ))}
          </div>
        </section>

        {/* Mobile */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="mobile">Mobile</Heading2>
          <Prose>
            codeR works on phones and tablets. The layout adapts automatically
            at the 768px breakpoint.
          </Prose>

          <Heading3>Editor on mobile</Heading3>
          <Prose>
            A bottom tab bar replaces the three-panel desktop layout. Tap{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Editor
            </strong>{' '}
            to focus the Monaco editor,{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Files
            </strong>{' '}
            to open the file explorer, or{' '}
            <strong style={{ color: 'var(--coder-text-primary)' }}>
              Collab
            </strong>{' '}
            to open the presence + chat + history panel. Switching panes never
            disconnects the WebSocket session — other collaborators remain
            unaware of your navigation.
          </Prose>

          <Heading3>Dashboard on mobile</Heading3>
          <Prose>
            Tap the hamburger icon in the top bar to open the sidebar drawer.
            Tap outside or navigate to close it. Room cards stack to a single
            column on phones, two columns on tablets.
          </Prose>

          <Callout type="tip">
            Font size is enforced at 14px minimum on mobile to prevent iOS from
            auto-zooming when the editor gains focus.
          </Callout>
        </section>

        {/* API Reference */}
        <section style={{ marginBottom: '48px' }}>
          <Heading2 id="api">API Reference</Heading2>
          <Prose>
            codeR exposes internal REST endpoints used by the frontend. All
            endpoints require authentication (session cookie) unless noted.
          </Prose>

          {[
            {
              method: 'GET',
              path: '/api/health',
              auth: false,
              desc: 'Health check — returns server and database status.',
            },
            {
              method: 'POST',
              path: '/api/auth/register',
              auth: false,
              desc: 'Create account with email + password. Body: { name, email, password }.',
            },
            {
              method: 'GET',
              path: '/api/user/profile',
              auth: true,
              desc: 'Fetch current user profile.',
            },
            {
              method: 'PATCH',
              path: '/api/user/profile',
              auth: true,
              desc: 'Update display name. Body: { name }.',
            },
            {
              method: 'GET',
              path: '/api/rooms',
              auth: true,
              desc: 'List rooms you own or are a member of.',
            },
            {
              method: 'POST',
              path: '/api/rooms',
              auth: true,
              desc: 'Create room. Body: { name, description?, language, isPublic }.',
            },
            {
              method: 'GET',
              path: '/api/rooms/[id]',
              auth: true,
              desc: 'Get room details and member list.',
            },
            {
              method: 'GET',
              path: '/api/rooms/[id]/snapshot',
              auth: false,
              desc: 'Fetch Yjs document snapshot (binary). Used by collab-server. Requires x-internal-secret header.',
            },
            {
              method: 'PUT',
              path: '/api/rooms/[id]/snapshot',
              auth: false,
              desc: 'Save Yjs snapshot. Used by collab-server. Requires x-internal-secret header.',
            },
          ].map(({ method, path, auth, desc }) => (
            <div
              key={`${method}:${path}`}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '12px 0',
                borderBottom: '1px solid var(--coder-border)',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color:
                    method === 'GET'
                      ? '#32D74B'
                      : method === 'POST'
                        ? '#0075DE'
                        : '#FF9F0A',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  minWidth: '44px',
                  paddingTop: '1px',
                }}
              >
                {method}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <InlineCode>{path}</InlineCode>
                  {!auth && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#FF9F0A',
                        backgroundColor: 'rgba(255,159,10,0.10)',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                      }}
                    >
                      no auth
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--coder-text-secondary)',
                    margin: 0,
                  }}
                >
                  {desc}
                </p>
              </div>
            </div>
          ))}

          <Callout type="info">
            The WebSocket collab server runs separately at{' '}
            <InlineCode>NEXT_PUBLIC_COLLAB_WS_URL</InlineCode>. It speaks the
            y-websocket protocol, not REST.
          </Callout>
        </section>

        {/* Next steps */}
        <div
          style={{
            border: '1px solid var(--coder-border)',
            borderRadius: '10px',
            padding: '24px',
            backgroundColor: 'var(--coder-bg-card)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--coder-text-primary)',
                marginBottom: '4px',
              }}
            >
              Ready to get started?
            </div>
            <div
              style={{ fontSize: '13px', color: 'var(--coder-text-secondary)' }}
            >
              Create a free account and start your first room.
            </div>
          </div>
          <Link
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '9999px',
              backgroundColor: 'var(--coder-accent)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Create account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </div>
  )
}
