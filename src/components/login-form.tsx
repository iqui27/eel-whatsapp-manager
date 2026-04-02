'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

interface LoginMetaUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  regionScope: string | null;
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [requireEmail, setRequireEmail] = useState(false);
  const [users, setUsers] = useState<LoginMetaUser[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const res = await fetch('/api/auth/login');
        const data = await res.json();
        if (!active) return;

        setConfigured(Boolean(data.configured));
        setRequireEmail(Boolean(data.requireEmail));
        setUsers(Array.isArray(data.users) ? data.users : []);
        if (Array.isArray(data.users) && data.users.length === 1) {
          setEmail(data.users[0].email);
        }
      } catch {
        if (!active) return;
        setConfigured(true);
        setRequireEmail(false);
        setUsers([]);
      } finally {
        if (active) {
          setMetaLoading(false);
        }
      }
    };

    void loadMeta();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Falha no login');
      }
      // Hard navigate so the browser sends the new auth cookie
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  if (!configured && !metaLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <h1 className="text-xl font-semibold">Sistema ainda não configurado</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Faça o setup inicial antes de tentar acessar o painel.
          </p>
          <a
            href="/setup"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Ir para setup
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 gap-6"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            E
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>EEL</div>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>WhatsApp Manager</div>
          </div>
        </div>

        <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--muted-foreground)' }}>
          Acesse a operação com o operador correto para respeitar permissões, escopo regional e trilha de auditoria.
        </p>

        {/* Feature pills */}
        <div className="flex flex-col gap-2">
          {['Gestão de chips em tempo real', 'Aquecimento automático de números', 'Dashboard com métricas detalhadas'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-8">
        <div
          className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex flex-col items-center gap-2 pb-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              E
            </div>
            <div className="text-center">
              <div className="font-bold" style={{ color: 'var(--foreground)' }}>EEL</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>WhatsApp Manager</div>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Bem-vindo</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Digite sua senha para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {requireEmail && (
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Operador
                </label>
                <select
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="flex h-11 w-full rounded-lg px-3 text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    '--tw-ring-color': 'var(--ring)',
                  } as React.CSSProperties}
                >
                  <option value="">Selecione o operador</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name}
                      {user.regionScope ? ` · ${user.regionScope}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Senha
              </label>
              <div className="relative flex items-center">
                <Lock
                  className="absolute left-3 h-3.5 w-3.5 pointer-events-none"
                  style={{ color: 'var(--muted-foreground)' }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="flex h-11 w-full rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    '--tw-ring-color': 'var(--ring)',
                  } as React.CSSProperties}
                />
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
                style={{
                  background: 'color-mix(in srgb, var(--destructive) 12%, transparent)',
                  color: 'var(--destructive)',
                  border: '1px solid color-mix(in srgb, var(--destructive) 25%, transparent)',
                }}
              >
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || metaLoading || !password || (requireEmail && !email)}
              className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {(loading || metaLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              {metaLoading ? 'Carregando...' : loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}