import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LangContext';
import { Eye, EyeOff, Truck, Package, Users, TrendingUp } from 'lucide-react';


export default function LoginPage() {
  const { login } = useAuth();
  const { lang, setLang } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const fr = lang === 'fr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(username, password, rememberMe); }
    catch { setError(fr ? 'Identifiants incorrects.' : 'بيانات غير صحيحة.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT: Login Panel (32%) — desktop only ─────────────────────── */}
      <div style={{
        width: '32%', minWidth: 340, maxWidth: 440,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        boxShadow: '4px 0 30px rgba(0,0,0,0.07)',
        overflow: 'hidden',
      }} className="login-desktop-panel">
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ marginBottom: '22px' }}>
              <img src="/logo.png" alt="ForCli" style={{ height: '48px', width: 'auto', display: 'block' }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {fr ? 'Bienvenue 👋' : 'مرحباً بك 👋'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {fr ? 'Connectez-vous à votre espace' : 'سجّل دخولك إلى لوحة الإدارة'}
            </p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', padding: '10px 14px', color: '#dc2626', fontSize: '13px',
              }}>⚠️ {error}</div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {fr ? "Nom d'utilisateur ou Email" : 'اسم المستخدم أو البريد الإلكتروني'}
              </label>
              <input className="form-control" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={fr ? 'admin ou email@exemple.com' : 'admin أو email@exemple.com'} autoComplete="username" required />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
                  {fr ? 'Mot de passe' : 'كلمة المرور'}
                </label>
                <button type="button" onClick={() => { setShowForgot(true); setForgotSent(false); setForgotEmail(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                  {fr ? 'Mot de passe oublié ?' : 'نسيت كلمة المرور؟'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input className="form-control" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required style={{ paddingRight: '42px' }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input id="remember-me-desktop" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#5629b8', cursor: 'pointer', flexShrink: 0 }} />
              <label htmlFor="remember-me-desktop" style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                {fr ? 'Se souvenir de moi' : 'تذكرني'}
              </label>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: loading ? 'rgba(86,41,184,0.5)' : 'linear-gradient(135deg, #5629b8, #7132ca)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(86,41,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> {fr ? 'Connexion...' : 'جاري...'}</> : (fr ? '→ Se connecter' : '→ دخول')}
            </button>
          </form>
        </div>
        <div style={{ padding: '12px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            © 2019 - {new Date().getFullYear()} ForCli · Powered by <a href="https://wa.me/213783773657" onClick={(e) => { e.preventDefault(); window.open('https://wa.me/213783773657', '_blank'); }} style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}>Baitul Tech</a>
          </span>
          <button onClick={() => setLang(fr ? 'ar' : 'fr')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {fr ? 'العربية' : 'Français'}
          </button>
        </div>
      </div>

      {/* ── RIGHT: Hero image (68%) ─────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} className="login-hero-panel">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(40,10,80,0.78) 0%, rgba(86,41,184,0.55) 50%, rgba(0,0,0,0.25) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '40px 48px' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.25)' }}>
              <span style={{ color: '#d8b4fe', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Distribution & Commerce</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '30px', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: '10px', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
              {fr ? 'Gérez votre réseau\nde distribution' : 'أدر شبكة توزيعك\nبكل سهولة'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.6, maxWidth: 440 }}>
              {fr ? 'Plateforme complète pour la gestion des ventes détail & gros, stocks, livraisons et paiements.' : 'منصة متكاملة لإدارة مبيعات التجزئة والجملة، المخزون والمدفوعات.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { icon: Truck, label: 'Livraisons', value: '1 200+' },
              { icon: Package, label: 'Produits', value: '300+' },
              { icon: Users, label: 'Clients', value: '500+' },
              { icon: TrendingUp, label: 'CA mensuel', value: '12 M DA' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color="#d8b4fe" />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginTop: '2px' }}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MOBILE ONLY: Full-screen hero background with glassmorphism form ── */}
      <div className="login-mobile-panel">
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 }} />
        {/* Dark green overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(30,10,60,0.85) 0%, rgba(60,20,120,0.72) 50%, rgba(0,0,0,0.60) 100%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          {/* Top brand */}
          <div style={{ padding: '52px 28px 0', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <img src="/logo.png" alt="ForCli" style={{ width: '100%', maxWidth: '200px', height: 'auto' }} />
            </div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '20px', padding: '4px 14px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span style={{ color: '#d8b4fe', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Distribution & Commerce</span>
            </div>
          </div>

          {/* Glassmorphism card */}
          <div style={{ margin: '0 16px', background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.20)', padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{fr ? 'Bienvenue 👋' : 'مرحباً بك 👋'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginBottom: '24px' }}>{fr ? 'Connectez-vous à votre espace' : 'سجّل دخولك إلى لوحة الإدارة'}</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '13px' }}>⚠️ {error}</div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>{fr ? "Nom d'utilisateur ou Email" : 'اسم المستخدم أو البريد الإلكتروني'}</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={fr ? 'admin ou email@exemple.com' : 'admin أو email@exemple.com'} autoComplete="username" required style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.6)' }}>{fr ? 'Mot de passe' : 'كلمة المرور'}</label>
                  <button type="button" onClick={() => { setShowForgot(true); setForgotSent(false); setForgotEmail(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8b4fe', fontSize: '11px', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                    {fr ? 'Mot de passe oublié ?' : 'نسيت كلمة المرور؟'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input id="remember-me-mobile" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#7132ca', cursor: 'pointer', flexShrink: 0 }} />
                <label htmlFor="remember-me-mobile" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', userSelect: 'none' }}>
                  {fr ? 'Se souvenir de moi' : 'تذكرني'}
                </label>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: loading ? 'rgba(86,41,184,0.5)' : 'linear-gradient(135deg, #5629b8, #7132ca)', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(113,50,202,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all 0.2s', marginTop: '4px' }}>
                {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> {fr ? 'Connexion...' : 'جاري...'}</> : (fr ? '→ Se connecter' : '→ دخول')}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
              © 2019 - {new Date().getFullYear()} ForCli · <a href="https://wa.me/213783773657" onClick={(e) => { e.preventDefault(); window.open('https://wa.me/213783773657', '_blank'); }} style={{ color: '#d8b4fe', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}>Baitul Tech</a>
            </span>
            <button onClick={() => setLang(fr ? 'ar' : 'fr')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {fr ? 'العربية' : 'Français'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ───────────────────────── */}
      {showForgot && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowForgot(false)}>
          <div style={{ background: 'var(--bg-surface, #fff)', borderRadius: '20px', padding: '32px 28px', maxWidth: 380, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', border: '1px solid var(--border, #e5e7eb)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #111)', marginBottom: '6px' }}>
              {fr ? '🔑 Mot de passe oublié' : '🔑 نسيت كلمة المرور'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)', marginBottom: '20px', lineHeight: 1.6 }}>
              {fr ? 'Entrez votre email. Un lien de réinitialisation vous sera envoyé.' : 'أدخل بريدك الإلكتروني. سيتم إرسال رابط إعادة التعيين إليك.'}
            </p>
            {forgotSent ? (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#16a34a', fontSize: '13px', textAlign: 'center' }}>
                ✅ {fr ? 'Email envoyé ! Vérifiez votre boîte mail.' : 'تم الإرسال! تحقق من بريدك الإلكتروني.'}
              </div>
            ) : (
              <>
                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder={fr ? 'votre@email.com' : 'بريدك@الالكتروني.com'} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border, #d1d5db)', background: 'var(--bg-elevated, #f9fafb)', color: 'var(--text-primary, #111)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '14px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowForgot(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border, #d1d5db)', background: 'transparent', color: 'var(--text-secondary, #374151)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {fr ? 'Annuler' : 'إلغاء'}
                  </button>
                  <button type="button" onClick={() => { if (forgotEmail) setForgotSent(true); }} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #5629b8, #7132ca)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {fr ? 'Envoyer' : 'إرسال'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        html, body { height: 100%; overflow: hidden; }
        input::placeholder { color: rgba(255,255,255,0.35); }

        /* Desktop: normal side-by-side layout */
        .login-mobile-panel { display: none; }
        .login-desktop-panel { display: flex; }
        .login-hero-panel { display: flex; }

        /* Mobile (≤768px): full-screen hero background */
        @media (max-width: 768px) {
          .login-desktop-panel { display: none !important; }
          .login-hero-panel { display: none !important; }
          .login-mobile-panel {
            display: block;
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}
