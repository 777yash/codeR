const releases = [
  {
    phase: '10.2',
    title: 'Codebase Cleanup & Security Activation',
    date: 'Jun 5, 2026',
    status: 'latest',
    accentColor: '#FF2D55',
    summary:
      'Dead code audit + full deduplication pass. CSRF and env validation wired in. Dead Prisma model dropped. 8 unused files deleted, 6 duplicate functions unified.',
    changes: [
      {
        type: 'security',
        items: [
          'verifyCsrfOrigin() now enforced on all 16 mutation endpoints (POST/PATCH/PUT/DELETE) — was defined but never called in 10.1',
          'Env validation (Zod schema in lib/env.ts) wired into instrumentation.ts Node.js startup — app now crashes fast on missing required env vars instead of failing silently at runtime',
        ],
      },
      {
        type: 'fix',
        items: [
          'Dead ChatMessage Prisma model removed — chat was always Yjs-only (Y.Array); the DB model was migrated but never queried; Prisma client regenerated',
          'version-history-panel.tsx deleted — version history already fully implemented in CollabPanel History tab; standalone file was an unreachable duplicate',
          'session-provider.tsx deleted — AuthSessionProvider was never mounted anywhere (no useSession consumers)',
          'lib/env.ts + lib/csrf.ts no longer dead — both wired at startup/routes respectively',
        ],
      },
      {
        type: 'refactor',
        items: [
          'getUserRoomRole() extracted to lib/api/room-access.ts — was copy-pasted identically in 6 separate API route files',
          'colorFromUserId() extracted to lib/color.ts — was duplicated in editor-client.tsx and collab-panel.tsx',
          'LANGUAGES constant extracted to lib/editor-options.ts — was copy-pasted in settings-client, editor-toolbar, and create-room-dialog',
          'OAuthButtons + GithubIcon/GoogleIcon/AUTH_INPUT_CLASS extracted to components/auth/auth-shared.tsx — was duplicated across sign-in and sign-up forms',
          'Dead exports removed: requireRole, isOwner, isAtLeastEditor from room-permissions.ts; auth.ts signIn re-export; DialogPortal/DialogOverlay; buttonVariants (external); editor-store Theme/LineNumbers/WordWrap types (external); SelectProps (external)',
        ],
      },
      {
        type: 'chore',
        items: [
          'Dead code + duplication sweep — 8 files deleted, 6 functions unified into shared lib/ modules',
          'Deleted 8 unused component files: run-button.tsx, ui/avatar.tsx, ui/badge.tsx, ui/card.tsx, ui/label.tsx, ui/separator.tsx, providers/session-provider.tsx, editor/version-history-panel.tsx',
          'tsc --noEmit: 0 errors throughout; eslint: 0 errors; prettier: all files formatted',
          'Pre-existing share.test.ts failures (7) — share route DELETE mock missing members[] field; noted but out of scope',
        ],
      },
    ],
  },
  {
    phase: '10.1',
    title: 'Security Hardening',
    date: 'Jun 4, 2026',
    status: 'shipped',
    accentColor: '#FF2D55',
    summary:
      'Full security audit: Content Security Policy headers, JWT token rotation, and auth gate on the AI completions endpoint.',
    changes: [
      {
        type: 'security',
        items: [
          'Content-Security-Policy header on all routes — default-src self; script-src includes cdn.jsdelivr.net for Monaco loader; frame-ancestors none; base-uri self; form-action self',
          'X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS (1yr), Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy',
          'JWT session maxAge reduced to 7 days (was 30); updateAge set to 1 hour — token re-signed hourly (rotation without DB overhead)',
          'POST /api/ai/complete now requires authenticated session — unauthenticated callers receive 401 instead of burning API quota',
          'verifyCsrfOrigin() utility in src/lib/csrf.ts — Origin header validation helper for per-route CSRF protection (activated in Phase 10.2)',
        ],
      },
    ],
  },
  {
    phase: '09',
    title: 'AI Completions',
    date: 'Jun 3, 2026',
    status: 'shipped',
    accentColor: '#BF5AF2',
    summary:
      'Inline AI code completions powered by Mistral Codestral FIM. Multi-line ghost text, context-aware suggestions across all open workspace files, per-user toggle persisted to localStorage.',
    changes: [
      {
        type: 'feature',
        items: [
          'Inline ghost text completions — Tab to accept, Escape to dismiss, showToolbar on hover',
          'Multi-line completions — max_tokens 128, no \\n\\n stop token',
          'Context-aware — smart prefix (file header + recent 60 lines), suffix (30 lines), up to 3 other workspace files as context blocks',
          'Language hint prepended to every prompt (// File: script.ts style) — prevents cross-language suggestions',
          'Per-user on/off toggle in editor settings panel and dashboard preferences panel',
          'Toggle persisted across sessions via Zustand persist middleware (localStorage key: coder-editor-prefs)',
          'Dashboard preferences panel — Settings button in sidebar now opens slide-in panel with AI Completions + Editor sections',
          'Dashboard profile panel — Profile link opens slide-in panel instead of navigating to a separate page',
        ],
      },
      {
        type: 'infra',
        items: [
          'POST /api/ai/complete — server-side Codestral FIM proxy; CODESTRAL_API_KEY never exposed to client',
          'Native fetch throughout — no @mistralai/mistralai package installed',
          'CODESTRAL_API_KEY optional in Zod env schema — app works without key (503 returns empty completion)',
          'monaco.languages.registerInlineCompletionsProvider("*") — registered on editor mount, disposed on cleanup',
          'Cancellation token + 300ms sleep debounce — stale calls cancelled by Monaco when user keeps typing',
          'disposeInlineCompletions + freeInlineCompletions both implemented (Monaco version compatibility)',
          'GET /api/user/profile extended to return hasPassword + providers[] for profile panel',
          'Zustand persist middleware with partialize — persists only preference fields (theme, lineNumbers, minimap, wordWrap, fontSize, inlineSuggest)',
        ],
      },
    ],
  },
  {
    phase: '08.2',
    title: 'Chat — Unread Badge & @Mentions',
    date: 'Jun 2, 2026',
    status: 'shipped',
    accentColor: '#06B6D4',
    summary:
      'Unread message count badge on the Chat tab, and @mention autocomplete with inline highlighting.',
    changes: [
      {
        type: 'feature',
        items: [
          'Unread count badge — red pill on the Chat tab showing messages received while on another tab; clears on tab switch',
          '@mention autocomplete — type @ to open a member dropdown filtered by prefix; click or Enter to insert',
          '@mentions highlighted in accent red in rendered message text',
          'Escape closes mention dropdown without sending; Enter with dropdown open inserts top suggestion',
        ],
      },
      {
        type: 'infra',
        items: [
          'lastReadRef (useRef) tracks message count at last chat-tab visit; frozen when off tab; unreadCount derived reactively',
          'mentionQuery state drives mentionSuggestions memo (filtered from members prop, excludes self)',
          'handleInputChange detects /@(\\S*)$/ at end of input to open/close dropdown',
          'onMouseDown on dropdown items prevents input blur before insertMention fires',
        ],
      },
    ],
  },
  {
    phase: '08.1',
    title: 'Chat — Code Snippet Sharing',
    date: 'Jun 1, 2026',
    status: 'shipped',
    accentColor: '#06B6D4',
    summary:
      'Share code snippets directly in chat — styled code blocks with copy button, language badge, and auto-detected language from the active editor file.',
    changes: [
      {
        type: 'feature',
        items: [
          'Code snippet mode — </> toggle button in chat input switches to monospace textarea (Ctrl+Enter to send)',
          'Language auto-detected from active editor file; displayed as badge in code block header',
          'Styled code block render — dark bg, scrollable (max 140px), copy button with 2s feedback checkmark',
          'Copy button uses navigator.clipboard; shows Check icon on success',
          '4000-char limit for code snippets (vs 500 for text messages)',
        ],
      },
      {
        type: 'infra',
        items: [
          'ChatMessageData interface extended: type?: "text" | "code", language?: string — backward compatible (existing messages render as text)',
          'sendChatMessage() passes type + language when code mode active; no Yjs schema change needed',
          'useEditorStore language selector wired into CollabPanel for live language detection',
        ],
      },
    ],
  },
  {
    phase: '08',
    title: 'In-Session Room Chat',
    date: 'Jun 1, 2026',
    status: 'shipped',
    accentColor: '#06B6D4',
    summary:
      'Real-time chat inside every room — powered by the existing Yjs WebSocket connection. Zero new infrastructure. Messages sync to all collaborators instantly and persist in the Yjs snapshot.',
    changes: [
      {
        type: 'feature',
        items: [
          'Chat tab in the collab panel — message list with per-user color coding, auto-scroll, and timestamps',
          'Send with Enter (Shift+Enter skipped), 500-char limit, Send button',
          'Messages color-coded by userId (same hash function as cursor colors — consistent identity across editor and chat)',
          'Empty state when no messages; messages persist as long as the Yjs doc lives (included in contentSnapshot)',
        ],
      },
      {
        type: 'infra',
        items: [
          "Y.Array<ChatMessageData>('chat-messages') — appended to the existing ydoc; synced via y-websocket with zero new WebSocket connections",
          'sendChatMessage(), getChatMessages(), subscribeToChatMessages() exported from editor-client.tsx — same module-level pattern as execution result subscribers',
          'chatArray observer wired in handleEditorMount alongside execResultsMap observer; unobserved in cleanup',
          'CollabPanel accepts currentUserName prop (threaded from EditorWrapper → page.tsx session)',
        ],
      },
    ],
  },
  {
    phase: '07.2',
    title: 'Version History — One-Click Restore',
    date: 'May 31, 2026',
    status: 'shipped',
    accentColor: '#FF9F0A',
    summary:
      'Restore any snapshot with one click — all live editors update instantly via Yjs CRDT. No page reload required.',
    changes: [
      {
        type: 'feature',
        items: [
          'Restore button in diff view — click any snapshot, compare, then restore with two-step confirm (Restore → Yes/Cancel)',
          'Live clients update instantly — collab-server applies content replacement to the live Y.Doc and broadcasts via y-websocket; all editors reflect restored state without reconnect',
          'Offline resilience — if collab-server is unreachable, room.contentSnapshot is still updated; clients see restored state on next reconnect',
        ],
      },
      {
        type: 'infra',
        items: [
          'POST /api/rooms/[id]/snapshots/[snapshotId]/restore — OWNER/EDITOR; updates room.contentSnapshot then calls collab-server /reset-doc/:roomId (5s timeout, non-fatal on failure)',
          'POST /reset-doc/:roomId on collab-server — verifies x-internal-secret; finds live Y.Doc via docs Map; applies file-list + per-file text restore in a single Y.transact; broadcasts diff to all connected clients',
          'Restore strategy: content replacement (delete + insert) inside Y.transact — avoids doc destruction, keeps WebSocket connections alive, handles multi-file workspaces and legacy single-file rooms',
        ],
      },
    ],
  },
  {
    phase: '07.1',
    title: 'Version History — Bug Fixes',
    date: 'May 30, 2026',
    status: 'shipped',
    accentColor: '#FF9F0A',
    summary:
      'Stability fixes for the version history panel: correct snapshot bytes on save, delete snapshots, and Monaco DiffEditor lifecycle fixes.',
    changes: [
      {
        type: 'fix',
        items: [
          'Stale snapshot bug — SaveVersionDialog now sends live Yjs bytes (getYjsStateBytes()) as base64 at save time; no longer reads room.contentSnapshot which lags up to 60s',
          'DiffEditor TextModel disposed error — DiffEditor stays mounted via display:none (not unmounted) while panel is open; both close paths call diffEditor.setModel(null) before React cleanup disposes models',
          'SaveVersionDialog infinite recursion — handleClose was calling itself instead of setOpen(false)',
          'Diff legend colors corrected: Snapshot = red (#FF2D55), Current = Monaco insertion green (#9bb955)',
        ],
      },
      {
        type: 'feature',
        items: [
          'Delete snapshot — trash icon on hover in version list; DELETE /api/rooms/[id]/snapshots/[snapshotId] (OWNER/EDITOR); optimistic removal from list',
        ],
      },
      {
        type: 'infra',
        items: [
          'getYjsStateBytes() exported from editor-client.tsx — stores Y.encodeStateAsUpdate ref at first dynamic import; returns full Uint8Array doc state (all files)',
          'POST /api/rooms/[id]/snapshots schema updated: accepts optional data (base64 Yjs state); falls back to room.contentSnapshot only if absent',
        ],
      },
    ],
  },
  {
    phase: '07',
    title: 'Version History',
    date: 'May 29, 2026',
    status: 'shipped',
    accentColor: '#FF9F0A',
    summary:
      'Persistent document snapshots with visual diff comparison. Auto-saves every 60 seconds via collab-server; users can save named versions at any time. History panel with tabbed Named / Auto-saves views and drag-to-resize.',
    changes: [
      {
        type: 'feature',
        items: [
          'Auto-snapshots every 60s — collab-server writes DocumentSnapshot rows via POST /api/rooms/[id]/snapshots/auto (capped at 50 per room)',
          'Named versions — bookmark icon in room header opens SaveVersionDialog; OWNER/EDITOR can label and save current state at any time',
          'Version history panel — History icon button, slide-in from right, drag-to-resize (min 380px, max 92vw)',
          'Tabbed list: Named tab (BookmarkCheck icon) + Auto-saves tab (Clock icon) with per-tab empty states',
          'Monaco DiffEditor — click any snapshot to compare it against current editor content (original=snapshot, modified=current)',
          'Per-user attribution: named snapshots record createdById; auto-saves store null (no user context)',
        ],
      },
      {
        type: 'infra',
        items: [
          'DocumentSnapshot Prisma model — id, label?, data Bytes, roomId, createdById? (nullable), createdAt. Index on [roomId, createdAt]',
          'saveAutoSnapshot() in collab-server/src/snapshot.ts — POSTs Y.Doc state bytes to /api/rooms/[id]/snapshots/auto with internal secret',
          'GET /api/rooms/[id]/snapshots — list (any member, limit 50); POST — named save (OWNER/EDITOR)',
          'GET /api/rooms/[id]/snapshots/[snapshotId] — decodes Yjs bytes server-side: reads file-list map for multi-file rooms, falls back to getText("content") for legacy',
          'Yjs decode type fix: Prisma Bytes = Uint8Array<ArrayBuffer>, yjs expects Uint8Array<ArrayBufferLike> — cast via `as unknown as Uint8Array`',
          'Snapshot interval changed from 30s to 60s in collab-server',
        ],
      },
    ],
  },
  {
    phase: '06.1',
    title: 'Execution Bug Fixes',
    date: 'May 29, 2026',
    status: 'shipped',
    accentColor: '#32D74B',
    summary:
      'Multi-file execution, terminal toggle for all users, cross-tab result sync, and Monaco lifecycle stability fixes.',
    changes: [
      {
        type: 'feature',
        items: [
          'Multi-file execution — getAllFilesContent() reads all Yjs texts; all workspace files sent to OneCompiler files[] (fixes C/C++ "undefined reference to main" across file tabs)',
          'Terminal toggle button — Terminal icon visible to all roles (VIEWER/EDITOR/OWNER); panel open state in Zustand store',
          'canRun prop — VIEWERs see output panel and results but Run button hidden; stdin disabled',
          'Viewer placeholder text: "Waiting for collaborator to run code…"',
        ],
      },
      {
        type: 'fix',
        items: [
          'Execution result sync across collaborators — subscribeToExecutionResults() now uses module-level Set (registered before ydoc is ready); observer wired in handleEditorMount after _ydoc = ydoc',
          'MonacoBinding double-destroy — WeakSet (_destroyedBindings) + bindingDestroyedRef (useRef) guard; safeDestroyBinding() wrapper used in activateFile and cleanup',
          'TextModel disposed before DiffEditorWidget — editor.trigger("hideSuggestWidget") → editor.setModel(null) → model.dispose() → editor.dispose() in correct order',
          'InstantiationService disposed — fullEditor.dispose() called last after all models disposed',
          'Duplicate React keys in FileExplorer/FileTabs — defensive Array.from(new Map(...).values()) dedup at render time',
        ],
      },
      {
        type: 'infra',
        items: [
          'execute/route.ts schema: code: string → files: { name, content }[] (min 1, max 20 files)',
          'executionPanelOpen + setExecutionPanelOpen added to editor-store; ExecutionPanel reads from store',
        ],
      },
    ],
  },
  {
    phase: '04.1',
    title: 'Horizontal Scaling via Redis Pub/Sub',
    date: 'May 28, 2026',
    status: 'shipped',
    accentColor: '#FF2D55',
    summary:
      'collab-server now scales horizontally. Yjs updates on one instance are broadcast to all instances via Redis pub/sub — multiple Render replicas share the same real-time document state.',
    changes: [
      {
        type: 'infra',
        items: [
          'redis-pubsub.ts — initRedis() + wireDocPubSub(docName, doc) bridge',
          'Separate pub + sub ioredis clients per process (subscriber mode restriction)',
          'Per-process INSTANCE_ID prevents self-echo: published messages carry origin ID, instances skip their own',
          'applyingRemote boolean per doc blocks re-publish when applying incoming Redis update (loop guard)',
          'Central dispatcher: single sub.on("message") listener routes by channel — no per-doc listener leak',
          'wireDocPubSub wired into setContentInitializor — every doc gets pub/sub on creation',
          'Graceful degradation: UPSTASH_REDIS_URL absent → single-instance mode, no behaviour change',
          'UPSTASH_REDIS_URL added to .env.example (rediss:// native protocol URL from Upstash Console)',
        ],
      },
    ],
  },
  {
    phase: '03.5',
    title: 'Multi-File Workspace',
    date: 'May 27, 2026',
    status: 'shipped',
    accentColor: '#FF9F0A',
    summary:
      'Full multi-file workspace — create, rename, and delete files per room. Each file has its own Yjs text; file list syncs across all collaborators in real-time.',
    changes: [
      {
        type: 'feature',
        items: [
          'Per-file Monaco models — switching tabs swaps the editor model, per-file undo/redo preserved',
          'File list synced via ydoc.getMap("file-list") — add/rename/delete propagates to all collaborators',
          'Per-file content at ydoc.getText("file:<id>") — each file has its own CRDT text',
          'Double-click filename in explorer to rename inline',
          'Right-click context menu in file explorer: Rename + Delete (protected: cannot delete last file)',
          'New file button in both file explorer and tab bar — auto-detects language from extension',
          'Legacy migration: rooms with single-file content (getText("content")) auto-migrated to getText("file:default") on first load',
        ],
      },
      {
        type: 'infra',
        items: [
          'File list seeded from store when Yjs doc is empty (new rooms); Yjs is truth for existing rooms',
          'Monaco models lazily created on first file activation, refreshed from ytext on re-activation',
          'setFiles() action added to editor-store for Yjs observer to sync UI',
          'Zustand store subscription (subscribe) used to trigger model switch on activeFileId change',
        ],
      },
    ],
  },
  {
    phase: '06',
    title: 'Code Execution Sandbox',
    date: 'May 24, 2026',
    status: 'shipped',
    accentColor: '#32D74B',
    summary:
      'Run code in 28 languages via OneCompiler. All collaborators see output simultaneously via Yjs map broadcast.',
    changes: [
      {
        type: 'feature',
        items: [
          'POST /api/execute → OneCompiler RapidAPI → result broadcast via ydoc.getMap("execution-results")',
          'ExecutionPanel bottom drawer: stdin textarea, stdout/stderr color-coded, status badge',
          'Status badges: idle / running / success / error / timeout / offline',
          'Stdin support for interactive programs (60s Vercel maxDuration, 55s AbortController)',
          'In-memory rate limiting: 10 runs/user/minute (Map-based sliding window)',
          'ExecutionLog Prisma model — persists every execution (language, stdin, stdout, exit_code, duration_ms)',
          '28 languages supported: key mappings javascript→nodejs, sql→sqlite, matlab→octave, vbnet→vb',
        ],
      },
      {
        type: 'fix',
        items: [
          'Java execution: file renamed to Main.java, public class forced to Main',
          'Graceful offline state when ONECOMPILER_RAPIDAPI_KEY missing — shows actionable message',
          'HTTP 502 from /api/execute maps to "offline" badge (not "error")',
        ],
      },
      {
        type: 'infra',
        items: [
          'ONECOMPILER_RAPIDAPI_KEY env var added to .env.example',
          'Zero new infrastructure — result delivery reuses existing Yjs WebSocket connection',
        ],
      },
    ],
  },
  {
    phase: '05',
    title: 'Presence & Awareness',
    date: 'May 17, 2026',
    status: 'shipped',
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
          'Periodic snapshot saves via `setContentInitializor` interval (60s since Phase 07)',
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
  security: { label: 'Security', color: '#FF2D55', bg: 'rgba(255,45,85,0.12)' },
  refactor: {
    label: 'Refactor',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.12)',
  },
  chore: { label: 'Chore', color: '#555555', bg: 'rgba(85,85,85,0.15)' },
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
          Phase 10.3 — Polish & Performance
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--coder-text-secondary)',
            maxWidth: '400px',
            margin: '0 auto 20px',
          }}
        >
          Monaco lazy loading, PostHog analytics, mobile-responsive layout, and
          GitHub Gist export.
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
