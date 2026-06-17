'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  Rocket,
  Sparkles,
  Keyboard,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import { SlidePanel } from '@/components/dashboard/slide-panel'

const QUICK_START = [
  'Create a room from the dashboard, then share its link or invite people by email.',
  'Everyone edits together in real time — coloured cursors show who is where.',
  'Press Run to execute code; JS/TS projects boot in the in-browser runtime with a live terminal and preview.',
  'Open the Files panel to add files and folders; language is detected per file.',
]

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl / ⌘ + S', action: 'Save a named version' },
  { keys: 'Ctrl + `', action: 'Toggle the terminal' },
  { keys: 'Tab', action: 'Accept an AI inline suggestion' },
  { keys: 'Esc', action: 'Dismiss an AI suggestion' },
]

const RESOURCES: { label: string; href: string }[] = [
  { label: 'Documentation', href: '/docs' },
  { label: 'Features', href: '/features' },
  { label: 'Changelog', href: '/changelog' },
]

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof HelpCircle
  children: React.ReactNode
}) {
  return (
    <p className="text-app-dim mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
      <Icon className="h-3 w-3" />
      {children}
    </p>
  )
}

export function DashboardHelpPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        Help
      </button>

      <SlidePanel open={open} onClose={() => setOpen(false)} title="Help">
        <div className="px-6 py-4">
          {/* Quick start */}
          <div data-slide-item>
            <SectionTitle icon={Rocket}>Quick Start</SectionTitle>
            <ul className="border-app-mid bg-app space-y-2 rounded-lg border p-4">
              {QUICK_START.map((tip, i) => (
                <li
                  key={i}
                  className="text-app-muted flex gap-2 text-xs leading-relaxed"
                >
                  <span className="text-app-accent shrink-0 font-semibold">
                    {i + 1}.
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* AI assistant */}
          <div data-slide-item className="mt-3">
            <SectionTitle icon={Sparkles}>AI Assistant</SectionTitle>
            <div className="border-app-mid bg-app rounded-lg border p-4">
              <p className="text-app-muted text-xs leading-relaxed">
                Open the <span className="text-app font-medium">AI</span> tab in
                a room to explain or debug code, or describe a project and have
                it built for you. Type{' '}
                <span className="text-app-accent font-mono">@ai</span> in the
                room chat to run the same actions in front of the whole team —
                e.g.{' '}
                <span className="text-app font-mono">
                  @ai add a /health route
                </span>{' '}
                or <span className="text-app font-mono">@ai run npm test</span>.
              </p>
            </div>
          </div>

          {/* Shortcuts */}
          <div data-slide-item className="mt-3">
            <SectionTitle icon={Keyboard}>Keyboard Shortcuts</SectionTitle>
            <div className="border-app-mid bg-app divide-app-mid divide-y rounded-lg border">
              {SHORTCUTS.map(({ keys, action }) => (
                <div
                  key={action}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <span className="text-app-muted text-xs">{action}</span>
                  <kbd className="border-app-mid bg-app-surface text-app-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div data-slide-item className="mt-3">
            <SectionTitle icon={BookOpen}>Resources</SectionTitle>
            <div className="border-app-mid bg-app divide-app-mid divide-y rounded-lg border">
              {RESOURCES.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover-app-row text-app-muted flex items-center justify-between px-4 py-2.5 text-xs transition-colors"
                >
                  {label}
                  <ExternalLink className="text-app-dim h-3 w-3" />
                </Link>
              ))}
            </div>
          </div>

          <p data-slide-item className="text-app-dim mt-6 text-xs">
            Need more help? Reach out at{' '}
            <a
              href="mailto:support@coder.app"
              className="text-app-accent hover:underline"
            >
              support@coder.app
            </a>
            .
          </p>
        </div>
      </SlidePanel>
    </>
  )
}
