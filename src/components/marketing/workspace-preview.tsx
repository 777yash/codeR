'use client'

import { useState } from 'react'
import {
  Braces,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  Play,
  Terminal,
  Users,
  Check,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'

const FILES = {
  'hello.ts': [
    'import { greet } from "./utils";',
    '',
    'const team = ["you", "your teammate"];',
    '',
    'team.forEach((name) => {',
    '  console.log(greet(name));',
    '});',
    '',
    '// A good idea starts with a hello.',
  ],
  'utils.ts': [
    'export function greet(name: string): string {',
    '  return `Hello, ${name}. Let’s build something.`;',
    '}',
    '',
    '// Small functions. Shared possibilities.',
  ],
  'package.json': [
    '{',
    '  "name": "our-next-idea",',
    '  "type": "module",',
    '  "scripts": {',
    '    "dev": "tsx hello.ts"',
    '  }',
    '}',
  ],
} as const
type DemoFile = keyof typeof FILES

function HighlightedLine({ line }: { line: string }) {
  const tokens = line.split(
    /("[^"\n]*"|`[^`\n]*`|\/\/.*$|\b(?:import|from|const|export|function|return|console|string)\b)/g
  )
  return (
    <>
      {tokens.map((token, index) => (
        <span
          key={index}
          className={
            token.startsWith('//')
              ? 'code-comment'
              : /^("|`)/.test(token)
                ? 'code-string'
                : /^(import|from|const|export|function|return|console|string)$/.test(
                      token
                    )
                  ? 'code-keyword'
                  : undefined
          }
        >
          {token}
        </span>
      ))}
    </>
  )
}

export function WorkspacePreview() {
  const [file, setFile] = useState<DemoFile>('hello.ts')
  const [ran, setRan] = useState(false)
  const [panel, setPanel] = useState<'terminal' | 'team'>('terminal')
  return (
    <div className="workspace-demo">
      <div className="demo-topbar">
        <div>
          <Braces size={16} />
          <span>our-next-idea</span>
          <span className="demo-badge">DEMO</span>
        </div>
        <div className="demo-topbar-actions">
          <span className="demo-avatars" aria-label="Two demo collaborators">
            <i>Y</i>
            <i>T</i>
          </span>
          <Link href="/signup" className="demo-invite">
            Your turn <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <div className="demo-body">
        <aside className="demo-explorer" aria-label="Demo files">
          <span className="demo-label">EXPLORER</span>
          <div className="demo-folder">
            <ChevronDown size={12} />
            <Folder size={13} /> our-next-idea
          </div>
          {(Object.keys(FILES) as DemoFile[]).map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => setFile(name)}
              aria-pressed={file === name}
              className={file === name ? 'is-selected' : ''}
            >
              <FileCode2 size={13} />
              {name}
            </button>
          ))}
        </aside>
        <div className="demo-editor">
          <div
            className="demo-tabs"
            role="tablist"
            aria-label="Preview file tabs"
          >
            {(Object.keys(FILES) as DemoFile[]).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                id={`tab-${name}`}
                aria-selected={file === name}
                aria-controls="demo-code"
                tabIndex={file === name ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')
                    return
                  event.preventDefault()
                  const names = Object.keys(FILES) as DemoFile[]
                  const next =
                    names[
                      (names.indexOf(file) +
                        (event.key === 'ArrowRight' ? 1 : -1) +
                        names.length) %
                        names.length
                    ]
                  setFile(next)
                  document.getElementById(`tab-${next}`)?.focus()
                }}
                onClick={() => setFile(name)}
              >
                <FileCode2 size={12} />
                {name}
              </button>
            ))}
          </div>
          <div className="demo-breadcrumb">
            our-next-idea <ChevronRight size={11} /> {file}
          </div>
          <div
            id="demo-code"
            role="tabpanel"
            aria-labelledby={`tab-${file}`}
            tabIndex={0}
            className="demo-code"
          >
            <pre>
              {FILES[file].map((line, index) => (
                <div className="demo-code-line" key={`${file}-${index}`}>
                  <span aria-hidden="true" className="line-number">
                    {index + 1}
                  </span>
                  <code>
                    <HighlightedLine line={line} />
                    {file === 'hello.ts' && index === 5 && (
                      <span className="demo-cursor" aria-hidden="true">
                        <span>Teammate</span>
                      </span>
                    )}
                  </code>
                </div>
              ))}
            </pre>
          </div>
          <div className="demo-panel-tabs">
            <div>
              <button
                type="button"
                onClick={() => setPanel('terminal')}
                aria-pressed={panel === 'terminal'}
              >
                <Terminal size={12} />
                Terminal
              </button>
              <button
                type="button"
                onClick={() => setPanel('team')}
                aria-pressed={panel === 'team'}
              >
                <Users size={12} />
                Team
              </button>
            </div>
            <button
              type="button"
              className="demo-run"
              onClick={() => {
                setRan(true)
                setPanel('terminal')
              }}
            >
              <Play size={12} /> Run sample
            </button>
          </div>
          <div className="demo-output" role="status" aria-live="polite">
            {panel === 'terminal' ? (
              ran ? (
                <>
                  <p className="code-comment">$ npm run dev</p>
                  <p>Hello, you. Let’s build something.</p>
                  <p>Hello, your teammate. Let’s build something.</p>
                  <p className="demo-exit">
                    <Check size={12} /> Process exited with code 0
                  </p>
                </>
              ) : (
                <>
                  <p className="code-comment">$ ready when you are.</p>
                  <p>Run the sample to see its output here.</p>
                </>
              )
            ) : (
              <>
                <p>
                  <span className="text-app-accent">Teammate</span>{' '}
                  <span className="code-comment">· just now</span>
                </p>
                <p>Small beginnings. Big possibilities.</p>
                <p className="code-comment">
                  Team chat and live cursors are available in your own room.
                </p>
              </>
            )}
          </div>
          <div className="demo-status">
            <span>
              <i className="demo-git-dot" /> main
            </span>
            <span>
              TypeScript <i /> UTF-8 <i /> 2 demo collaborators
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
