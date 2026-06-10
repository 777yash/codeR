import Link from 'next/link'
import { Users, Play, Sparkles, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div
      style={{ position: 'relative', overflow: 'hidden' }}
      className="selection:bg-[var(--coder-accent)] selection:text-white"
    >
      {/* Radial glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '600px',
          background:
            'radial-gradient(ellipse at top, rgba(244,63,94,0.05), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Hero */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '80px 24px 96px',
        }}
      >
        {/* Announcement pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '9999px',
            border: '1px solid var(--coder-border-accent)',
            backgroundColor: 'var(--coder-bg-card)',
            padding: '6px 16px',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--coder-text-accent)',
            }}
          >
            ✦ Now with AI completions
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: 'var(--coder-text-primary)',
            marginBottom: '24px',
            maxWidth: '700px',
          }}
        >
          Code Together.
          <br />
          Ship Faster<span style={{ color: 'var(--coder-accent)' }}>.</span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: '18px',
            lineHeight: 1.6,
            color: 'var(--coder-text-secondary)',
            maxWidth: '520px',
            marginBottom: '40px',
          }}
        >
          A real-time collaborative code editor with live execution,
          presence-aware cursors, and AI completions. Zero setup required.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <Link
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '48px',
              padding: '0 32px',
              borderRadius: '9999px',
              backgroundColor: 'var(--coder-accent)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              boxShadow: 'var(--coder-shadow-accent)',
              transition: 'background-color 150ms ease, box-shadow 150ms ease',
            }}
          >
            Start Coding Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/features"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '48px',
              padding: '0 32px',
              borderRadius: '9999px',
              border: '1px solid var(--coder-border-mid)',
              backgroundColor: 'transparent',
              color: 'var(--coder-text-primary)',
              fontSize: '16px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            See all features
          </Link>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--coder-text-tertiary)' }}>
          Free · Start Coding Together Now!
        </p>
      </section>

      {/* Editor Preview Mockup */}
      <section
        style={{
          padding: '0 24px 80px',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.10)',
            backgroundColor: '#101014',
            overflow: 'hidden',
            boxShadow:
              '0 16px 48px rgba(0,0,0,0.35), 0 32px 96px rgba(244,63,94,0.10)',
          }}
        >
          {/* Browser chrome */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px',
              height: '40px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              backgroundColor: '#0a0a0c',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '9999px',
                backgroundColor: '#62626e',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '9999px',
                backgroundColor: '#62626e',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '9999px',
                backgroundColor: '#62626e',
              }}
            />
          </div>

          {/* Editor content */}
          <div
            style={{
              display: 'flex',
              height: '380px',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            {/* File sidebar */}
            <div
              className="hidden sm:flex"
              style={{
                width: '200px',
                flexShrink: 0,
                flexDirection: 'column',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                backgroundColor: '#101014',
                padding: '8px 0',
              }}
            >
              <div
                style={{
                  padding: '4px 16px 8px',
                  fontSize: '11px',
                  color: '#62626e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                MY-PROJECT
              </div>
              {[
                { name: 'fibonacci.py', active: true },
                { name: 'utils.py', active: false },
                { name: 'requirements.txt', active: false },
              ].map(({ name, active }) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '1px 8px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    borderLeft: active ? '2px solid #f43f5e' : 'none',
                    backgroundColor: active ? '#1e1e26' : 'transparent',
                    color: active ? '#eeeef2' : '#9a9aa5',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ fontSize: '14px', opacity: 0.8 }}>📄</span>
                  {name}
                </div>
              ))}
            </div>

            {/* Code area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden',
                backgroundColor: '#0a0a0c',
                padding: '16px 0',
              }}
            >
              {/* Line numbers */}
              <div
                style={{
                  width: '36px',
                  flexShrink: 0,
                  paddingRight: '12px',
                  textAlign: 'right',
                  color: '#62626e',
                  fontSize: '13px',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  userSelect: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i}>{i + 8}</span>
                ))}
              </div>

              {/* Code */}
              <div
                style={{
                  flex: 1,
                  paddingLeft: '16px',
                  whiteSpace: 'pre',
                  color: '#eeeef2',
                  position: 'relative',
                }}
              >
                <div>
                  <span style={{ color: '#f43f5e' }}>def</span>{' '}
                  <span style={{ color: '#58A6FF' }}>fibonacci</span>
                  {'(n: '}
                  <span style={{ color: '#9a9aa5' }}>int</span>
                  {') -> '}
                  <span style={{ color: '#9a9aa5' }}>int</span>:
                </div>
                <div>
                  {'  '}
                  <span style={{ color: '#FF9F0A' }}>
                    &quot;&quot;&quot;Return the nth Fibonacci
                    number.&quot;&quot;&quot;
                  </span>
                </div>

                {/* Alice selection + cursor */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '300px',
                      backgroundColor: 'rgba(244,63,94,0.16)',
                    }}
                  />
                  <div style={{ position: 'relative' }}>
                    {'  '}
                    <span style={{ color: '#f43f5e' }}>if</span>
                    {' n <= '}
                    <span style={{ color: '#32D74B' }}>0</span>:
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '65px',
                        width: '2px',
                        height: '16px',
                        backgroundColor: '#f43f5e',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '-4px',
                          marginBottom: '2px',
                          backgroundColor: '#f43f5e',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 500,
                          padding: '1px 4px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Alice
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    backgroundColor: 'rgba(244,63,94,0.16)',
                  }}
                >
                  {'    '}
                  <span style={{ color: '#f43f5e' }}>raise</span>{' '}
                  <span style={{ color: '#BF5AF2' }}>ValueError</span>
                  {'('}
                  <span style={{ color: '#FF9F0A' }}>
                    &quot;n must be positive&quot;
                  </span>
                  )
                </div>

                <div>
                  {'  '}
                  <span style={{ color: '#f43f5e' }}>if</span>
                  {' n <= '}
                  <span style={{ color: '#32D74B' }}>2</span>:
                </div>
                <div>
                  {'    '}
                  <span style={{ color: '#f43f5e' }}>return</span>{' '}
                  <span style={{ color: '#32D74B' }}>1</span>
                </div>
                <div>
                  {'  '}
                  <span style={{ color: '#f43f5e' }}>return</span>
                  {' fibonacci(n - '}
                  <span style={{ color: '#32D74B' }}>1</span>
                  {') + fibonacci(n - '}
                  <span style={{ color: '#32D74B' }}>2</span>)
                </div>
                <br />
                {/* Sam cursor */}
                <div style={{ position: 'relative' }}>
                  <span style={{ color: '#f43f5e' }}>def</span>{' '}
                  <span style={{ color: '#58A6FF' }}>fibonacci_sequence</span>(
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '150px',
                      width: '2px',
                      height: '16px',
                      backgroundColor: '#BF5AF2',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '-4px',
                        marginBottom: '2px',
                        backgroundColor: '#BF5AF2',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Sam
                    </div>
                  </div>
                </div>
                <div>
                  {'  limit: '}
                  <span style={{ color: '#9a9aa5' }}>int</span>,
                </div>
                <div>
                  {'  memo: '}
                  <span style={{ color: '#9a9aa5' }}>Optional</span>
                  {'['}
                  <span style={{ color: '#9a9aa5' }}>dict</span>
                  {'] = '}
                  <span style={{ color: '#BF5AF2' }}>None</span>
                </div>
                <div>
                  {') -> '}
                  <span style={{ color: '#9a9aa5' }}>list</span>
                  {'['}
                  <span style={{ color: '#9a9aa5' }}>int</span>
                  ]:
                </div>
                <br />
                {/* Marcus cursor on TODO */}
                <div
                  style={{
                    position: 'relative',
                    width: '400px',
                    backgroundColor: 'rgba(255,159,10,0.15)',
                  }}
                >
                  <span style={{ color: '#62626e', fontStyle: 'italic' }}>
                    # TODO: add memoization for performance
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: 0,
                      width: '2px',
                      height: '16px',
                      backgroundColor: '#FF9F0A',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '-4px',
                        marginBottom: '2px',
                        backgroundColor: '#FF9F0A',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Marcus
                    </div>
                  </div>
                </div>
                {/* AI ghost suggestion */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span style={{ color: '#62626e', fontStyle: 'italic' }}>
                    def fibonacci_memo(n: int, memo: dict = {}) -&gt; int:
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#BF5AF2',
                      backgroundColor: 'rgba(191,90,242,0.20)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    ✦ AI
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section
        id="features"
        style={{
          padding: '0 24px 96px',
          maxWidth: '1040px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {[
            {
              icon: <Users className="h-6 w-6" />,
              iconColor: 'var(--coder-accent)',
              title: 'Real-Time Collaboration',
              desc: 'See every keystroke as it happens. Colored cursors, selections, and presence for every collaborator.',
            },
            {
              icon: <Play className="h-6 w-6" fill="currentColor" />,
              iconColor: '#32D74B',
              title: 'Live Code Execution',
              desc: 'Run Python, JavaScript, Go, Rust, and 24+ more languages in isolated, secure sandboxes.',
            },
            {
              icon: <Sparkles className="h-6 w-6" />,
              iconColor: '#BF5AF2',
              title: 'AI Completions',
              desc: 'Inline suggestions powered by Mistral Codestral — accepts with Tab, dismisses with Escape.',
            },
          ].map(({ icon, iconColor, title, desc }) => (
            <div
              key={title}
              className="marketing-feature-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                borderRadius: '12px',
                border: '1px solid',
                padding: '32px',
                boxShadow: 'var(--coder-shadow-sm)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--coder-bg-card-active)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: iconColor,
                }}
              >
                {icon}
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--coder-text-primary)',
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--coder-text-secondary)',
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section
        style={{
          borderTop: '1px solid var(--coder-border)',
          borderBottom: '1px solid var(--coder-border)',
          padding: '48px 24px',
          marginBottom: '96px',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '32px',
            textAlign: 'center',
          }}
        >
          {[
            { value: '29', label: 'Languages supported' },
            { value: 'CRDT', label: 'Conflict-free sync' },
            { value: '<50ms', label: 'Collaboration latency' },
            { value: 'Free', label: 'Forever on solo plan' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--coder-accent)',
                  letterSpacing: '-0.02em',
                  marginBottom: '4px',
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--coder-text-secondary)',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section
        style={{
          padding: '0 24px 96px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--coder-text-primary)',
            marginBottom: '16px',
          }}
        >
          Ready to code together?
        </h2>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--coder-text-secondary)',
            marginBottom: '32px',
          }}
        >
          Create a room in seconds. No install, no config.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '48px',
            padding: '0 40px',
            borderRadius: '9999px',
            backgroundColor: 'var(--coder-accent)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            boxShadow: 'var(--coder-shadow-accent)',
          }}
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  )
}
