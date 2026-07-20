import CreateRoom from '@/components/CreateRoom'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D11] via-[#0D1117] to-[#111827]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,212,170,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(255,107,107,0.04),transparent)]" />

      {/* Header with logo */}
      <header className="relative z-20 max-w-6xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[#00B4D8] shadow-[var(--shadow-glow)]">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-base sm:text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Watch Party
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 sm:py-16">
        {/* Hero - clean, headline-first */}
        <div className="text-center mb-10 sm:mb-16 animate-fade-in-up">
          <h2
            className="text-3xl sm:text-4xl md:text-6xl font-black text-[var(--text-primary)] mb-4 sm:mb-5 leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            با دوستات همزمان{' '}
            <span className="gradient-text">فیلم ببین</span>
            <br />
            <span className="text-[var(--accent)]">اونم رایگان</span>
          </h2>
          <p
            className="text-[var(--text-secondary)] text-base sm:text-lg max-w-xl mx-auto leading-relaxed px-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            اتاق بساز، لینک ویدیو بذار، دوستان رو دعوت کن. همه با هم و هماهنگ تماشا می‌کنن، بدون هیچ هزینه‌ای.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-12 sm:mb-16">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              ),
              title: 'لینک اشتراک‌گذاری',
              desc: 'اتاق بسازید و لینک آن را با دوستان به اشتراک بگذارید',
              color: 'var(--accent)',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ),
              title: 'یوتیوب یا لینک مستقیم',
              desc: 'لینک یوتیوب یا لینک مستقیم ویدیو بگذارید',
              color: '#00B4D8',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              ),
              title: 'چت آنلاین',
              desc: 'در حین تماشا با دوستان خود گفتگو کنید',
              color: 'var(--accent-warm)',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative bg-[var(--bg-card)] rounded-xl p-4 sm:p-6 border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300 hover:shadow-[var(--shadow-card)]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center mb-2 sm:mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${feature.color}15`, color: feature.color }}
              >
                {feature.icon}
              </div>
              <h3
                className="text-[var(--text-primary)] font-bold mb-1 text-[13px] sm:text-[15px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {feature.title}
              </h3>
              <p className="text-[var(--text-secondary)] text-[11px] sm:text-sm leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Create Room Form */}
        <div className="max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CreateRoom />
        </div>

        {/* Footer */}
        <footer className="mt-16 sm:mt-20 text-center border-t border-[var(--border-subtle)] pt-6 sm:pt-8 pb-6 sm:pb-4">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[var(--text-muted)] text-xs sm:text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              ساخته شده با عشق توسط
            </p>
            <div className="flex items-center justify-center gap-3 text-xs sm:text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="font-semibold text-[var(--text-secondary)]">SPK</span>
              <span className="text-[var(--text-muted)]">&</span>
              <span className="font-semibold text-[var(--text-secondary)]">MMDJ</span>
            </div>
            <p className="text-[var(--text-muted)] text-[10px] sm:text-xs mt-2 opacity-60" style={{ fontFamily: 'var(--font-body)' }}>
              تحت مجوز MIT — {new Date().getFullYear()} © sinapk
            </p>
          </div>
        </footer>
      </div>

      {/* Branding watermark — fixed, always visible */}
      <div className="fixed bottom-2 left-2 sm:bottom-3 sm:left-3 z-50 pointer-events-none select-none">
        <span
          className="text-[10px] sm:text-[11px] tracking-wider text-white/[0.08] font-medium"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.1em' }}
        >
          sinapk
        </span>
      </div>
    </main>
  )
}
