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
  const fr = lang === 'fr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(username, password); }
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
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #5629b8, #7132ca)',
              borderRadius: '12px', padding: '8px 16px', marginBottom: '22px',
            }}>
              <span style={{ fontSize: '18px' }}>🚚</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px' }}>ForCli</span>
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
                {fr ? "Nom d'utilisateur" : 'اسم المستخدم'}
              </label>
              <input className="form-control" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {fr ? 'Mot de passe' : 'كلمة المرور'}
              </label>
              <div style={{ position: 'relative' }}>
                <input className="form-control" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required style={{ paddingRight: '42px' }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: loading ? 'rgba(86,41,184,0.5)' : 'linear-gradient(135deg, #5629b8, #7132ca)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(86,41,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> {fr ? 'Connexion...' : 'جاري...'}</> : (fr ? '→ Se connecter' : '→ دخول')}
            </button>
          </form>
        </div>
        <div style={{ padding: '12px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            © 2025 ForCli · Powered by <a href="https://www.baitul.tech/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>Baitul Tech</a>
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #5629b8, #7132ca)', borderRadius: '14px', padding: '10px 20px', marginBottom: '14px', boxShadow: '0 4px 20px rgba(113,50,202,0.4)' }}>
              <span style={{ fontSize: '20px' }}>🚚</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>ForCli</span>
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
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>{fr ? "Nom d'utilisateur" : 'اسم المستخدم'}</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username" required style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>{fr ? 'Mot de passe' : 'كلمة المرور'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: loading ? 'rgba(86,41,184,0.5)' : 'linear-gradient(135deg, #5629b8, #7132ca)', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(113,50,202,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all 0.2s', marginTop: '4px' }}>
                {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> {fr ? 'Connexion...' : 'جاري...'}</> : (fr ? '→ Se connecter' : '→ دخول')}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
              © 2025 ForCli · <a href="https://www.baitul.tech/" target="_blank" rel="noopener noreferrer" style={{ color: '#d8b4fe', textDecoration: 'none', fontWeight: 600 }}>Baitul Tech</a>
            </span>
            <button onClick={() => setLang(fr ? 'ar' : 'fr')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {fr ? 'العربية' : 'Français'}
            </button>
          </div>
        </div>
      </div>

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
