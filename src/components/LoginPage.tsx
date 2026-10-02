import { useState, type FormEvent } from 'react';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ShieldX } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { DatabaseError } from '@/services/database';
import { TLM_PRIMARY, TLM_SECONDARY, TLM_SUPPORT } from '@/config/theme';
import { useBranding } from '@/hooks/useBranding';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageSelector from '@/components/LanguageSelector';

const MAX_ATTEMPTS = 6;

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

function TLMLogo() {
  return (
    <svg viewBox="0 0 140 140" className="h-24 w-24" role="img" aria-label="The Leprosy Mission">
      <defs>
        <linearGradient id="tlm-cross-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={TLM_PRIMARY} />
          <stop offset="100%" stopColor={TLM_SECONDARY} />
        </linearGradient>
      </defs>
      {/* Outer ring */}
      <circle cx="70" cy="70" r="64" fill="none" stroke={TLM_PRIMARY} strokeWidth="3" opacity="0.2" />
      {/* Tilted rounded cross — the iconic TLM symbol */}
      <g transform="rotate(18 70 70)">
        <rect x="56" y="20" width="28" height="100" rx="14" fill="url(#tlm-cross-grad)" />
        <rect x="20" y="56" width="100" height="28" rx="14" fill="url(#tlm-cross-grad)" />
      </g>
      {/* Hands cradling underneath */}
      <path
        d="M32 108 Q70 124 108 108"
        fill="none"
        stroke={TLM_SECONDARY}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M38 116 Q70 128 102 116"
        fill="none"
        stroke={TLM_PRIMARY}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { notify } = useToast();
  const { branding } = useBranding();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const isLockedOut = failedAttempts >= MAX_ATTEMPTS;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLockedOut || !email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(email, password);
      notify('success', t('login.loginSuccess'));
    } catch (err) {
      const msg = err instanceof DatabaseError
        ? (err.isCors ? `${err.message}` : err.message)
        : err instanceof Error ? err.message : t('login.loginFailed');
      setError(msg);
      setFailedAttempts((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingAttempts = MAX_ATTEMPTS - failedAttempts;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7f2f5] via-[#fdf5ef] to-[#f7f2f5] p-4">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-md">
        {/* Institutional identity */}
        <div className="mb-6 flex flex-col items-center text-center md:mb-8">
          {branding.logo ? (
            <img
              src={branding.logo}
              alt="Logótipo"
              className="h-24 w-24 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <TLMLogo />
          )}
          <h1
            className="mt-6 whitespace-pre-line text-lg font-extrabold uppercase tracking-[0.14em] leading-tight"
            style={{ color: TLM_PRIMARY }}
          >
            {branding.loginTitle}
          </h1>
          <div
            className="mt-3 h-px w-24"
            style={{ background: `linear-gradient(90deg, transparent, ${TLM_SECONDARY}, transparent)` }}
          />
          <p
            className="mt-3 text-sm font-bold uppercase tracking-[0.08em]"
            style={{ color: TLM_SECONDARY }}
          >
            {branding.loginSubtitle}
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:p-8">
          {/* Top accent bar */}
          <div
            className="mb-6 h-1.5 w-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}
          />

          {isLockedOut && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-4">
              <ShieldX className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-bold text-rose-900">{t('login.locked')}</p>
                <p className="mt-1 text-sm text-rose-700">
                  {t('login.lockedDesc')}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t('login.email')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  autoComplete="email"
                  autoFocus
                  disabled={isLockedOut}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ caretColor: TLM_PRIMARY }}
                  onFocus={(e) => {
                    e.target.style.borderColor = TLM_PRIMARY;
                    e.target.style.boxShadow = `0 0 0 2px ${TLM_PRIMARY}1A`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  disabled={isLockedOut}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-10 text-sm text-slate-700 placeholder:text-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ caretColor: TLM_PRIMARY }}
                  onFocus={(e) => {
                    e.target.style.borderColor = TLM_PRIMARY;
                    e.target.style.boxShadow = `0 0 0 2px ${TLM_PRIMARY}1A`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLockedOut}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && !isLockedOut && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLockedOut && failedAttempts > 0 && (
              <p className="text-center text-xs font-medium text-amber-600">
                {t('login.attemptOf', { n: failedAttempts, max: MAX_ATTEMPTS })} {remainingAttempts === 1 ? t('login.remainingAttempt', { n: remainingAttempts }) : t('login.remainingAttempts', { n: remainingAttempts })}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || isLockedOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: TLM_PRIMARY }}
              onMouseEnter={(e) => {
                if (!submitting && !isLockedOut) e.currentTarget.style.backgroundColor = TLM_SUPPORT;
              }}
              onMouseLeave={(e) => {
                if (!submitting && !isLockedOut) e.currentTarget.style.backgroundColor = TLM_PRIMARY;
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('login.submitting')}
                </>
              ) : isLockedOut ? (
                <>
                  <ShieldX className="h-4 w-4" />
                  {t('login.locked')}
                </>
              ) : (
                branding.loginButtonText
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {t('login.useCredentials')}
        </p>
      </div>
    </div>
  );
}
