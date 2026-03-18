'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';
import { SetupWizardNavCompact } from '@/components/setup-wizard-nav';
import { Progress } from '@/components/ui/progress';
import {
  loadWizardState,
  saveWizardState,
  type WizardState,
  type WizardStep,
  getCompletionPercentage,
  WIZARD_STEPS,
} from '@/lib/setup-wizard';
import { Loader2 } from 'lucide-react';

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Extract current step from pathname
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const stepMatch = pathname.match(/\/wizard\/([^/]+)/);
  const currentStep: WizardStep = (stepMatch?.[1] as WizardStep) || 'chips';
  
  // Load state on mount
  useEffect(() => {
    const loaded = loadWizardState();
    setState(loaded);
    setLoading(false);
  }, []);
  
  // Save state when it changes
  useEffect(() => {
    if (state) {
      saveWizardState(state);
    }
  }, [state]);
  
  // Context for step pages
  const contextValue = {
    state,
    setState,
    currentStep,
  };
  
  if (loading || !state) {
    return (
      <SidebarLayout currentPage="wizard" pageTitle="Assistente de Configuração">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SidebarLayout>
    );
  }
  
  const completionPct = getCompletionPercentage(state);
  const currentStepInfo = WIZARD_STEPS.find(s => s.id === currentStep);
  
  return (
    <SidebarLayout currentPage="wizard" pageTitle={currentStepInfo?.title || 'Assistente de Configuração'}>
      <div className="flex flex-col h-full">
        {/* Progress header */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground">Assistente de Configuração</h1>
              <span className="text-sm text-muted-foreground">
                {completionPct}% completo
              </span>
            </div>
            <SetupWizardNavCompact state={state} currentStep={currentStep} />
          </div>
          <Progress value={completionPct} className="h-1.5" />
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </SidebarLayout>
  );
}