'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Senha incorreta');
      }

      router.push('/');
    } catch {
      setError('Senha incorreta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0B1220]">
      {/* Left panel – brand */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 gap-4">
        <div className="text-[48px] font-bold text-white leading-none">EEL</div>
        <div className="text-[18px] text-[#A1A1AA]">WhatsApp Manager</div>
        <p className="text-[14px] text-[#52525B] max-w-xs mt-4 leading-relaxed">
          Gerencie seus chips WhatsApp e automatize o aquecimento de números com a Evolution API.
        </p>
        <div className="flex items-center gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span className="text-[13px] text-[#71717A]">Sistema operacional</span>
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-sm bg-[#111827] border border-[#1F2937] rounded-2xl p-8 flex flex-col gap-6">
          {/* Mobile brand */}
          <div className="lg:hidden text-center">
            <div className="text-[32px] font-bold text-white">EEL</div>
            <div className="text-[13px] text-[#71717A]">WhatsApp Manager</div>
          </div>

          <div>
            <h1 className="text-[22px] font-semibold text-white">Bem-vindo</h1>
            <p className="text-[14px] text-[#71717A] mt-1">Digite sua senha para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-[#A1A1AA] font-medium">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="h-11 rounded-lg border border-[#374151] bg-[#1F2937] text-white text-[14px] px-3 outline-none focus:border-[#3B82F6] placeholder:text-[#4B5563]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[13px] text-[#EF4444]">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="h-11 rounded-lg bg-[#3B82F6] text-white text-[14px] font-medium border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2563EB] transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
