'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, HelpCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TooltipStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  link?: {
    text: string;
    href: string;
  };
}

const TOOLTIPS_STORAGE_KEY = 'eel-onboarding-tooltips-seen';

const DEFAULT_TOOLTIP_STEPS: TooltipStep[] = [
  {
    id: 'chips-section',
    target: '[data-tooltip="chips-section"]',
    title: 'Monitoramento de Chips',
    content: 'Aqui voce ve o status de todos os chips conectados. Chips vermelhos precisam de atencao, verdes estao saudaveis.',
    position: 'bottom',
    link: {
      text: 'Ver documentacao de chips',
      href: '/chips',
    },
  },
  {
    id: 'campaigns-section',
    target: '[data-tooltip="campaigns-section"]',
    title: 'Campanhas Ativas',
    content: 'Acompanhe o progresso das suas campanhas em tempo real. Barras verdes indicam mensagens entregues.',
    position: 'bottom',
  },
  {
    id: 'groups-section',
    target: '[data-tooltip="groups-section"]',
    title: 'Capacidade dos Grupos',
    content: 'Monitore a ocupacao dos grupos WhatsApp. Grupos proximos da capacidade precisam de grupos overflow.',
    position: 'bottom',
  },
  {
    id: 'messages-feed',
    target: '[data-tooltip="messages-feed"]',
    title: 'Feed de Mensagens',
    content: 'Veja as ultimas mensagens enviadas e recebidas em tempo real.',
    position: 'bottom',
  },
  {
    id: 'kpis-section',
    target: '[data-tooltip="kpis-section"]',
    title: 'KPIs de Conversao',
    content: 'Metricas de desempenho: taxa de entrega, leitura, resposta e adesao aos grupos.',
    position: 'bottom',
  },
  {
    id: 'alerts-panel',
    target: '[data-tooltip="alerts-panel"]',
    title: 'Painel de Alertas',
    content: 'Alertas importantes sobre failovers, chips offline, e grupos proximos da capacidade.',
    position: 'bottom',
  },
  {
    id: 'refresh-button',
    target: '[data-tooltip="refresh-button"]',
    title: 'Atualizacao Manual',
    content: 'Clique para atualizar os dados manualmente. A pagina atualiza automaticamente a cada 10 segundos.',
    position: 'bottom',
  },
];

interface OnboardingTooltipsProps {
  steps?: TooltipStep[];
  onComplete?: () => void;
}

export function OnboardingTooltips({ steps = DEFAULT_TOOLTIP_STEPS, onComplete }: OnboardingTooltipsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [seenTooltips, setSeenTooltips] = useState<Set<string>>(new Set());
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Load seen tooltips from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TOOLTIPS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenTooltips(new Set(parsed));
      } catch {
        setSeenTooltips(new Set());
      }
    }
  }, []);

  // Calculate target position
  useEffect(() => {
    if (!isVisible) return;

    const step = steps[currentStep];
    if (!step) return;

    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // If target not found, try again after a short delay
      const timer = setTimeout(() => {
        const retryTarget = document.querySelector(step.target);
        if (retryTarget) {
          setTargetRect(retryTarget.getBoundingClientRect());
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, currentStep, steps]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsVisible(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsVisible(false);
    const newSeen = new Set(seenTooltips);
    steps.forEach((step) => newSeen.add(step.id));
    setSeenTooltips(newSeen);
    localStorage.setItem(TOOLTIPS_STORAGE_KEY, JSON.stringify([...newSeen]));
    onComplete?.();
  }, [seenTooltips, steps, onComplete]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      closeTour();
    }
  }, [currentStep, steps.length, closeTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const resetTour = useCallback(() => {
    setSeenTooltips(new Set());
    localStorage.removeItem(TOOLTIPS_STORAGE_KEY);
    startTour();
  }, [startTour]);

  const step = steps[currentStep];

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect) return { display: 'none' };

    const padding = 12;
    const tooltipWidth = 320;

    let left: number;
    let top: number;

    switch (step?.position) {
      case 'top':
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.top - padding - 150;
        break;
      case 'bottom':
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + padding;
        break;
      case 'left':
        left = targetRect.left - tooltipWidth - padding;
        top = targetRect.top + targetRect.height / 2 - 75;
        break;
      case 'right':
        left = targetRect.right + padding;
        top = targetRect.top + targetRect.height / 2 - 75;
        break;
      default:
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        top = targetRect.bottom + padding;
    }

    // Keep tooltip within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - 200));

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
    };
  };

  if (!isVisible) {
    // Show button to start tour if there are unseen tooltips
    const unseenSteps = steps.filter((s) => !seenTooltips.has(s.id));
    if (unseenSteps.length === 0) {
      return null;
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={startTour}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <HelpCircle className="h-4 w-4" />
        Tour
      </Button>
    );
  }

  if (!step || !targetRect) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={closeTour}
      />

      {/* Highlight cutout */}
      {targetRect && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'fixed z-50 rounded-lg border bg-background p-4 shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
        style={getTooltipStyle()}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-foreground">{step.title}</h4>
            <button
              onClick={closeTour}
              className="text-muted-foreground hover:text-foreground -mr-1 -mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">{step.content}</p>

          {step.link && (
            <a
              href={step.link.href}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {step.link.text}
              <ChevronRight className="h-3 w-3" />
            </a>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} de {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={nextStep}>
                {currentStep < steps.length - 1 ? 'Proximo' : 'Concluir'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper hook to check if tour should be auto-started
export function useOnboardingState(steps: TooltipStep[] = DEFAULT_TOOLTIP_STEPS) {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TOOLTIPS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const seen = new Set(parsed);
        setHasSeenTour(seen.size > 0);
        const unseenSteps = steps.filter((s) => !seen.has(s.id));
        setShouldShowTour(unseenSteps.length > 0);
      } catch {
        setShouldShowTour(true);
      }
    } else {
      setShouldShowTour(true);
    }
  }, [steps]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(TOOLTIPS_STORAGE_KEY);
    setHasSeenTour(false);
    setShouldShowTour(true);
  }, []);

  return { shouldShowTour, hasSeenTour, resetOnboarding };
}

// Re-export types
export type { TooltipStep as OnboardingTooltipStep };