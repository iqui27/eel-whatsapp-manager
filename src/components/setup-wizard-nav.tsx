'use client';

import { cn } from '@/lib/utils';
import { Check, SkipForward } from 'lucide-react';
import type { WizardStep, WizardState } from '@/lib/setup-wizard';
import { WIZARD_STEPS, getStepIndex, isStepCompleted, isStepSkipped, canProgressToStep } from '@/lib/setup-wizard';

interface SetupWizardNavProps {
  state: WizardState;
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}

export function SetupWizardNav({ state, currentStep, onStepClick }: SetupWizardNavProps) {
  const currentIdx = getStepIndex(currentStep);
  
  return (
    <div className="flex items-center gap-0 w-full">
      {WIZARD_STEPS.map((step, idx) => {
        const completed = isStepCompleted(state, step.id);
        const skipped = isStepSkipped(state, step.id);
        const active = step.id === currentStep;
        const isPast = idx < currentIdx;
        const canNavigate = canProgressToStep(state, step.id);
        const isClickable = canNavigate || completed || skipped;
        
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex flex-col items-center gap-1.5 transition-all',
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold border-2 transition-all',
                  completed && 'border-green-500 bg-green-500 text-white',
                  skipped && !completed && 'border-amber-500 bg-amber-500/20 text-amber-600',
                  active && !completed && !skipped && 'border-primary bg-primary/10 text-primary scale-110',
                  !completed && !skipped && !active && 'border-border bg-background text-muted-foreground',
                )}
              >
                {completed ? (
                  <Check className="h-5 w-5" />
                ) : skipped ? (
                  <SkipForward className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <div className="text-center">
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap block',
                    active ? 'text-primary' : completed ? 'text-green-600' : skipped ? 'text-amber-600' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {!step.required && (
                  <span className="text-[10px] text-muted-foreground/70 block">
                    {skipped ? 'pulou' : 'opcional'}
                  </span>
                )}
              </div>
            </button>
            
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3 mb-5 rounded-full transition-colors',
                  isPast || completed ? 'bg-green-500' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact version for use in step pages
interface SetupWizardNavCompactProps {
  state: WizardState;
  currentStep: WizardStep;
}

export function SetupWizardNavCompact({ state, currentStep }: SetupWizardNavCompactProps) {
  const currentIdx = getStepIndex(currentStep);
  
  return (
    <div className="flex items-center gap-1.5">
      {WIZARD_STEPS.map((step, idx) => {
        const completed = isStepCompleted(state, step.id);
        const skipped = isStepSkipped(state, step.id);
        const active = step.id === currentStep;
        const isPast = idx < currentIdx;
        
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            <div
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                completed ? 'bg-green-500' :
                skipped ? 'bg-amber-500' :
                active ? 'bg-primary' :
                isPast ? 'bg-green-400' : 'bg-border',
              )}
              title={step.title}
            />
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-4 rounded-full transition-colors',
                  isPast ? 'bg-green-400' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}