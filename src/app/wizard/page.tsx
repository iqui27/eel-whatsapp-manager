'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/SidebarLayout';
import { SetupWizardNav } from '@/components/setup-wizard-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  loadWizardState,
  saveWizardState,
  clearWizardState,
  type WizardState,
  type WizardStep,
  getCompletionPercentage,
  getAllStepsCompleted,
  WIZARD_STEPS,
  setCurrentStep,
} from '@/lib/setup-wizard';
import {
  Smartphone,
  Upload,
  Target,
  UsersRound,
  Send,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_ICONS = {
  chips: Smartphone,
  import: Upload,
  segments: Target,
  groups: UsersRound,
  campaign: Send,
};

export default function WizardPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState | null>(null);
  
  useEffect(() => {
    const loaded = loadWizardState();
    setState(loaded);
  }, []);
  
  useEffect(() => {
    if (state) {
      saveWizardState(state);
    }
  }, [state]);
  
  if (!state) {
    return (
      <SidebarLayout currentPage="wizard" pageTitle="Assistente de Configuração">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </SidebarLayout>
    );
  }
  
  const completionPct = getCompletionPercentage(state);
  const allCompleted = getAllStepsCompleted(state);
  
  const handleStepClick = (step: WizardStep) => {
    router.push(`/wizard/${step}`);
  };
  
  const handleStartWizard = () => {
    router.push('/wizard/chips');
  };
  
  const handleResetWizard = () => {
    if (confirm('Tem certeza que deseja reiniciar o assistente? Todo o progresso será perdido.')) {
      clearWizardState();
      setState(loadWizardState());
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Assistente de Configuração</h1>
        <p className="text-muted-foreground">
          Configure seu sistema em menos de 10 minutos com nosso assistente guiado.
        </p>
      </div>
      
      {/* Progress card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Progresso</CardTitle>
            <span className="text-sm font-medium text-primary">{completionPct}% completo</span>
          </div>
        </CardHeader>
        <CardContent>
          <SetupWizardNav
            state={state}
            currentStep={state.progress.currentStep}
            onStepClick={handleStepClick}
          />
        </CardContent>
      </Card>
      
      {/* Status message */}
      {allCompleted ? (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">
                  Configuração Concluída!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Seu sistema está pronto para uso. Você pode começar a enviar campanhas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : state.progress.completedSteps.length > 0 ? (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                  Configuração em Andamento
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Você tem {state.progress.completedSteps.length} de {WIZARD_STEPS.filter(s => s.required).length} etapas obrigatórias concluídas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
      
      {/* Steps overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WIZARD_STEPS.map((step) => {
          const Icon = STEP_ICONS[step.id];
          const completed = state.progress.completedSteps.includes(step.id);
          const skipped = state.progress.skippedSteps.includes(step.id);
          const isActive = state.progress.currentStep === step.id;
          
          return (
            <Card
              key={step.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                completed && 'border-green-500/50',
                isActive && 'border-primary',
                skipped && 'border-amber-500/50 opacity-60',
              )}
              onClick={() => handleStepClick(step.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      completed ? 'bg-green-100 text-green-600' :
                      skipped ? 'bg-amber-100 text-amber-600' :
                      'bg-muted text-muted-foreground',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {step.label}
                        {!step.required && (
                          <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {step.title}
                      </CardDescription>
                    </div>
                  </div>
                  {completed && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {skipped && !completed && (
                    <span className="text-xs text-amber-600">Pulado</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground">
                  {getStepDescription(step.id, state)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        {!allCompleted && (
          <Button onClick={handleStartWizard} size="lg">
            {state.progress.completedSteps.length > 0 ? 'Continuar' : 'Começar Configuração'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {state.progress.completedSteps.length > 0 && (
          <Button variant="outline" onClick={handleResetWizard}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar
          </Button>
        )}
      </div>
    </div>
  );
}

function getStepDescription(step: WizardStep, state: WizardState): string {
  switch (step) {
    case 'chips':
      const chipCount = state.chips.configured.length;
      const connectedCount = state.chips.configured.filter(c => c.connected).length;
      return chipCount > 0
        ? `${chipCount} chip(s) configurado(s), ${connectedCount} conectado(s)`
        : 'Configure seus chips WhatsApp e escaneie o QR code para conectar.';
    
    case 'import':
      return state.import.completed
        ? `${state.import.importedRows} eleitores importados`
        : 'Importe sua base de eleitores via CSV com detecção automática de colunas.';
    
    case 'segments':
      return state.segments.items.length > 0
        ? `${state.segments.items.length} segmento(s) criado(s)`
        : 'Crie segmentos para organizar seus eleitores por região, tags, etc.';
    
    case 'groups':
      return state.groups.items.length > 0
        ? `${state.groups.items.length} grupo(s) criado(s)`
        : 'Crie grupos WhatsApp para cada segmento com links de convite.';
    
    case 'campaign':
      return state.campaign.id
        ? `Campanha "${state.campaign.name}" pronta`
        : 'Crie sua primeira campanha e envie mensagens personalizadas.';
    
    default:
      return '';
  }
}