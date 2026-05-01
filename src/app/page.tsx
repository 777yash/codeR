import Link from 'next/link'
import { Users, Play, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#000000] font-sans text-[#F0F0F0] selection:bg-[#FF2D55] selection:text-white">
      {/* TopNav */}
      <nav className="fixed top-0 z-50 flex h-[64px] w-full items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#000000]/80 px-6 backdrop-blur-[20px]">
        <div className="flex items-center gap-2">
          <span className="flex items-center text-[20px] font-bold tracking-[-0.02em] text-white">
            codeR
            <span className="ml-1 h-4 w-2 animate-pulse rounded-[2px] bg-[#FF2D55]"></span>
          </span>
        </div>
        <div className="hidden items-center gap-8 text-[15px] text-[#888888] md:flex">
          <Link
            href="#features"
            className="transition-colors hover:text-[#F0F0F0]"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="transition-colors hover:text-[#F0F0F0]"
          >
            Pricing
          </Link>
          <Link href="#docs" className="transition-colors hover:text-[#F0F0F0]">
            Docs
          </Link>
          <Link
            href="#changelog"
            className="transition-colors hover:text-[#F0F0F0]"
          >
            Changelog
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/signin"
            className="hidden rounded-[6px] border border-transparent px-4 py-2 text-[15px] font-medium text-[#F0F0F0] transition-colors hover:border-[rgba(255,255,255,0.10)] hover:text-white md:block"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#FF2D55] px-5 py-2 text-[15px] font-medium text-white transition-all hover:shadow-[0_0_20px_rgba(255,45,85,0.20)]"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-grow flex-col items-center px-6 pt-[120px]">
        {/* Radial Gradient Background */}
        <div className="pointer-events-none absolute top-0 left-1/2 z-[-1] h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,45,85,0.04),transparent_70%)]"></div>

        <div className="mt-8 flex w-full max-w-[800px] flex-col items-center text-center">
          {/* AI Pill */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(255,45,85,0.30)] bg-[#1A0A0D] px-4 py-1.5">
            <span className="text-[12px] font-medium text-[#FF2D55]">
              ✦ Now with AI completions
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-[56px] leading-[1.1] font-bold tracking-[-0.02em] text-white">
            Code Together.
            <br />
            Ship Faster<span className="text-[#FF2D55]">.</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-[520px] text-[18px] leading-[1.6] text-[#888888]">
            A real-time collaborative code editor with live execution,
            presence-aware cursors, and AI completions. Zero setup required.
          </p>

          {/* CTAs */}
          <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="flex h-[48px] w-full items-center justify-center rounded-full bg-[#FF2D55] px-8 text-[16px] font-medium text-white transition-all hover:shadow-[0_0_20px_rgba(255,45,85,0.20)] sm:w-auto"
            >
              Start Coding Free <span className="ml-2 font-bold">→</span>
            </Link>
            <Link
              href="#demo"
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[rgba(255,255,255,0.10)] bg-transparent px-8 text-[16px] font-medium text-white transition-all hover:bg-[#1A0A0D] sm:w-auto"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Demo
            </Link>
          </div>

          <p className="mb-[64px] text-[13px] text-[#555555]">
            Trusted by 12,000+ developers · Free forever on solo plan
          </p>

          {/* Editor Preview Mockup */}
          <div className="relative z-20 flex w-full max-w-[960px] flex-col overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.10)] bg-[#0D0D0D] text-left shadow-[0_32px_80px_rgba(255,45,85,0.12)]">
            {/* Browser Header */}
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[rgba(255,255,255,0.06)] bg-[#000000] px-4">
              <div className="h-3 w-3 rounded-full bg-[#555555]"></div>
              <div className="h-3 w-3 rounded-full bg-[#555555]"></div>
              <div className="h-3 w-3 rounded-full bg-[#555555]"></div>
            </div>

            {/* Mockup Content */}
            <div className="flex h-[380px] w-full font-mono text-[13px] leading-[1.6]">
              {/* Sidebar mock */}
              <div className="hidden w-[220px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#0D0D0D] py-2 sm:flex">
                <div className="px-4 py-2 font-sans text-[11px] tracking-wider text-[#555555] uppercase">
                  MY-PROJECT
                </div>
                <div className="mx-2 flex items-center gap-2 rounded-[4px] border-l-2 border-[#FF2D55] bg-[#2D1018] px-2 py-1 text-[#F0F0F0]">
                  <span className="text-[14px] leading-none opacity-80">
                    📄
                  </span>{' '}
                  fibonacci.py
                </div>
                <div className="mx-2 flex items-center gap-2 rounded-[4px] px-2 py-1 text-[#888888]">
                  <span className="text-[14px] leading-none opacity-80">
                    📄
                  </span>{' '}
                  utils.py
                </div>
                <div className="mx-2 flex items-center gap-2 rounded-[4px] px-2 py-1 text-[#888888]">
                  <span className="text-[14px] leading-none opacity-80">
                    📄
                  </span>{' '}
                  requirements.txt
                </div>
              </div>

              {/* Editor Area mock */}
              <div className="relative flex flex-grow overflow-hidden bg-[#000000] py-4 text-[#F0F0F0]">
                <div className="flex w-[36px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.06)] pr-3 text-right text-[#555555] select-none">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span key={i}>{i + 8}</span>
                  ))}
                </div>
                <div className="relative flex-grow pl-4 whitespace-pre">
                  <div>
                    <span className="text-[#FF2D55]">def</span>{' '}
                    <span className="text-[#58A6FF]">fibonacci</span>(n:{' '}
                    <span className="text-[#888888]">int</span>) -&gt;{' '}
                    <span className="text-[#888888]">int</span>:
                  </div>
                  <div className="text-[#FF9F0A]">
                    {' '}
                    &quot;&quot;&quot;Return the nth Fibonacci
                    number.&quot;&quot;&quot;
                  </div>
                  <div>
                    {' '}
                    <span className="text-[#FF2D55]">if</span> n &lt;={' '}
                    <span className="text-[#32D74B]">0</span>:
                  </div>

                  {/* Lines 11-12 with Alice Selection & Cursor */}
                  <div className="relative inline-block w-full">
                    <div className="absolute inset-0 w-[300px] bg-[rgba(255,45,85,0.15)]"></div>
                    <div className="relative z-10">
                      <span> </span>
                      <span className="text-[#FF2D55]">raise</span>{' '}
                      <span className="text-[#BF5AF2]">ValueError</span>(
                      <span className="text-[#FF9F0A]">
                        &quot;n must be positive&quot;
                      </span>
                      ){/* Alice Cursor */}
                      <div className="absolute top-[2px] left-[65px] h-[16px] w-[2px] bg-[#FF2D55]">
                        <div className="absolute bottom-full left-[-4px] mb-[2px] flex flex-col items-center rounded-[4px] bg-[#FF2D55] px-[4px] py-[1px] font-sans text-[10px] leading-none font-medium text-white">
                          Alice
                          <div className="absolute top-full h-0 w-0 border-t-[4px] border-r-[3px] border-l-[3px] border-transparent border-t-[#FF2D55]"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative inline-block w-full">
                    <div className="absolute inset-0 w-[300px] bg-[rgba(255,45,85,0.15)]"></div>
                    <div className="relative z-10">
                      {' '}
                      <span className="text-[#FF2D55]">if</span> n &lt;={' '}
                      <span className="text-[#32D74B]">2</span>:
                    </div>
                  </div>

                  <div>
                    {' '}
                    <span className="text-[#FF2D55]">return</span>{' '}
                    <span className="text-[#32D74B]">1</span>
                  </div>
                  <div>
                    {' '}
                    <span className="text-[#FF2D55]">return</span> fibonacci(n -{' '}
                    <span className="text-[#32D74B]">1</span>) + fibonacci(n -{' '}
                    <span className="text-[#32D74B]">2</span>)
                  </div>
                  <br />
                  <div>
                    <span className="text-[#FF2D55]">def</span>{' '}
                    <span className="text-[#58A6FF]">fibonacci_sequence</span>(
                  </div>
                  <div>
                    {' '}
                    limit: <span className="text-[#888888]">int</span>,
                  </div>
                  <div>
                    {' '}
                    memo: <span className="text-[#888888]">Optional</span>[
                    <span className="text-[#888888]">dict</span>] ={' '}
                    <span className="text-[#BF5AF2]">None</span>
                  </div>
                  <div className="relative inline-block w-full">
                    ) -&gt; <span className="text-[#888888]">list</span>[
                    <span className="text-[#888888]">int</span>]:
                    {/* Sam Cursor */}
                    <div className="absolute top-[2px] left-[150px] h-[16px] w-[2px] bg-[#BF5AF2]">
                      <div className="absolute bottom-full left-[-4px] mb-[2px] flex flex-col items-center rounded-[4px] bg-[#BF5AF2] px-[4px] py-[1px] font-sans text-[10px] leading-none font-medium text-white">
                        Sam
                        <div className="absolute top-full h-0 w-0 border-t-[4px] border-r-[3px] border-l-[3px] border-transparent border-t-[#BF5AF2]"></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    {' '}
                    <span className="text-[#FF2D55]">if</span> memo{' '}
                    <span className="text-[#FF2D55]">is</span>{' '}
                    <span className="text-[#BF5AF2]">None</span>:
                  </div>
                  <div> memo = {}</div>
                  <br />
                  <div className="relative w-[400px] bg-[rgba(255,159,10,0.15)]">
                    <span className="text-[#555555] italic">
                      # TODO: add memoization for performance
                    </span>
                    {/* Marcus Cursor */}
                    <div className="absolute top-[2px] left-0 h-[16px] w-[2px] bg-[#FF9F0A]">
                      <div className="absolute bottom-full left-[-4px] mb-[2px] flex flex-col items-center rounded-[4px] bg-[#FF9F0A] px-[4px] py-[1px] font-sans text-[10px] leading-none font-medium text-white">
                        Marcus
                        <div className="absolute top-full h-0 w-0 border-t-[4px] border-r-[3px] border-l-[3px] border-transparent border-t-[#FF9F0A]"></div>
                      </div>
                    </div>
                  </div>
                  <div className="relative flex w-[550px] items-center bg-[rgba(255,255,255,0.02)]">
                    <span className="text-[#555555] italic">
                      def fibonacci_memo(n: int, memo: dict = {}) -&gt; int:
                    </span>
                    <span className="ml-4 flex items-center gap-1 rounded-[4px] bg-[rgba(191,90,242,0.20)] px-2 py-0.5 font-sans text-[10px] text-[#BF5AF2]">
                      ✦ AI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Strip */}
        <div className="mt-16 mb-24 grid w-full max-w-[1000px] grid-cols-1 gap-6 text-left md:grid-cols-3">
          {/* Card 1 */}
          <div className="group flex flex-col gap-4 rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#1A0A0D] p-8 transition-colors duration-150 hover:border-[rgba(255,45,85,0.30)] hover:bg-[#2D1018]">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#3D1520]">
              <Users className="h-6 w-6 text-[#FF2D55]" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">
              Real-Time Collaboration
            </h3>
            <p className="text-[13px] leading-relaxed text-[#888888]">
              See every keystroke as it happens. Colored cursors, selections,
              and presence for every collaborator.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group flex flex-col gap-4 rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#1A0A0D] p-8 transition-colors duration-150 hover:border-[rgba(255,45,85,0.30)] hover:bg-[#2D1018]">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#3D1520]">
              <Play className="h-6 w-6 text-[#32D74B]" fill="currentColor" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">
              Live Code Execution
            </h3>
            <p className="text-[13px] leading-relaxed text-[#888888]">
              Run Python, JavaScript, Go, Rust and 20+ more languages in
              isolated, secure sandboxes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group flex flex-col gap-4 rounded-[6px] border border-[rgba(255,255,255,0.06)] bg-[#1A0A0D] p-8 transition-colors duration-150 hover:border-[rgba(255,45,85,0.30)] hover:bg-[#2D1018]">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[6px] bg-[#3D1520]">
              <Sparkles className="h-6 w-6 text-[#BF5AF2]" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">
              AI Completions
            </h3>
            <p className="text-[13px] leading-relaxed text-[#888888]">
              Inline suggestions powered by GPT-4o — accepts with Tab, dismisses
              with Escape.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-[rgba(255,255,255,0.06)] py-6 text-center text-[13px] text-[#555555]">
        © {new Date().getFullYear()} codeR · GitHub · Twitter · Privacy · Terms
      </footer>

      {/* Digital Stationery Variant Thumbnail */}
      <div className="group fixed right-8 bottom-8 z-50">
        <div className="flex h-[120px] w-[200px] origin-bottom-right cursor-pointer flex-col overflow-hidden rounded-[10px] border border-[rgba(0,0,0,0.10)] bg-[#F6F5F4] bg-[#FFFFFF] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-transform hover:scale-105">
          <div className="mb-2 text-[11px] font-semibold text-[#888888]">
            Light Theme Preview
          </div>
          <div className="flex w-full flex-grow overflow-hidden rounded-[6px] border border-[rgba(0,0,0,0.06)] shadow-sm">
            <div className="h-full w-[30%] border-r border-[rgba(0,0,0,0.06)] bg-[#ECEAE8]"></div>
            <div className="flex h-full w-[70%] flex-col bg-[#FFFFFF]">
              <div className="mb-1 h-2 w-full bg-[#0075DE]/10"></div>
              <div className="flex flex-col gap-1 px-2 py-1">
                <div className="h-1 w-1/2 rounded-[1px] bg-[#0075DE]"></div>
                <div className="h-1 w-3/4 rounded-[1px] bg-black/80"></div>
                <div className="h-1 w-2/3 rounded-[1px] bg-black/40"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
