'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

type Status = 'loading' | 'valid' | 'invalid' | 'submitting' | 'done' | 'error';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null) as { error?: string } | null;
          setErrorMsg(data?.error ?? 'Link inválido ou expirado.');
          setStatus('invalid');
        } else {
          const data = await res.json() as { name: string; email: string };
          setUserName(data.name);
          setUserEmail(data.email);
          setStatus('valid');
        }
      })
      .catch(() => { setStatus('invalid'); setErrorMsg('Erro ao validar o link.'); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setErrorMsg('Senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setErrorMsg('As senhas não coincidem.'); return; }

    setErrorMsg('');
    setStatus('submitting');

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setStatus('done');
        setTimeout(() => router.push('/'), 2000);
      } else {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setErrorMsg(data?.error ?? 'Erro ao ativar conta.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6">
          <h1 className="text-white text-lg font-semibold tracking-tight">EEL Eleitoral</h1>
          <p className="text-slate-400 text-sm mt-0.5">Sistema de gestão eleitoral</p>
        </div>

        <div className="px-8 py-8">
          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Validando link de convite…</p>
            </div>
          )}

          {/* Invalid / expired */}
          {(status === 'invalid') && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="font-semibold text-slate-800">Link inválido ou expirado</h2>
              <p className="text-sm text-slate-500 max-w-xs">
                {errorMsg || 'Este link de convite não é mais válido. Peça ao administrador para reenviar o convite.'}
              </p>
            </div>
          )}

          {/* Done */}
          {status === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="font-semibold text-slate-800">Conta ativada!</h2>
              <p className="text-sm text-slate-500">
                Bem-vindo(a), <strong>{userName}</strong>! Você será redirecionado(a) em instantes.
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-1" />
            </div>
          )}

          {/* Form */}
          {(status === 'valid' || status === 'submitting' || status === 'error') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Criar sua senha</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Olá, <strong>{userName}</strong>! Defina a senha para acessar o sistema.
                </p>
                {userEmail && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{userEmail}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={status === 'submitting'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Password strength hint */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[6, 8, 12].map(len => (
                      <div
                        key={len}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= len ? 'bg-green-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {password.length < 6 ? 'Muito curta' : password.length < 8 ? 'Razoável' : password.length < 12 ? 'Boa' : 'Forte'}
                  </p>
                </div>
              )}

              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={status === 'submitting' || !password || !confirm}
              >
                {status === 'submitting' ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Ativando conta…</>
                ) : 'Ativar conta e entrar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
