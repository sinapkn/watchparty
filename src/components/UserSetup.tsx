'use client'

import { useState } from 'react'

interface UserSetupProps {
  onJoin: (username: string) => void
}

export default function UserSetup({ onJoin }: UserSetupProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = username.trim()
    if (!trimmed) {
      setError('لطفاً نام خود را وارد کنید')
      return
    }

    if (trimmed.length < 2) {
      setError('نام باید حداقل ۲ کاراکتر باشد')
      return
    }

    if (trimmed.length > 20) {
      setError('نام نباید بیشتر از ۲۰ کاراکتر باشد')
      return
    }

    onJoin(trimmed)
  }

  return (
    <div className="min-h-dvh sm:min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D11] via-[#0D1117] to-[#111827]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(0,212,170,0.06),transparent)]" />

      <div className="relative z-10 bg-[var(--bg-card)] rounded-xl p-6 sm:p-8 shadow-[var(--shadow-elevated)] border border-[var(--border-subtle)] max-w-md w-full animate-fade-in-up">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-[var(--accent)] to-[#00B4D8] shadow-[var(--shadow-glow)]">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1
            className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-1.5 sm:mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            به اتاق خوش آمدید!
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm" style={{ fontFamily: 'var(--font-body)' }}>
            برای ورود به اتاق، یک نام انتخاب کنید
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
              نام شما
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="نام خود را وارد کنید"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition text-center text-lg text-[16px] sm:text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/30 text-[var(--accent-warm)] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-center" style={{ fontFamily: 'var(--font-body)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-6 bg-gradient-to-r from-[var(--accent)] to-cyan-400 text-[var(--bg-deep)] font-bold rounded-xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)] transition-all duration-200 text-sm min-h-[48px]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ورود به اتاق
          </button>
        </form>
      </div>
    </div>
  )
}
