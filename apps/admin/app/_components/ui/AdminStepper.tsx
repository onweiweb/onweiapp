"use client";

import { useState } from "react";
import { AdminButton } from "./AdminButton";

export interface AdminStepItem {
  id: string;
  label: string;
  content: React.ReactNode;
  /** Set false while this step is active to disable "Next" (e.g. required fields empty). Defaults to true. */
  canAdvance?: boolean;
}

export function AdminStepper({
  steps,
  submitLabel,
  submitDisabled,
}: {
  steps: AdminStepItem[];
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex];
  const isLastStep = activeIndex === steps.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isComplete = index < activeIndex;
          return (
            <li key={step.id}>
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                disabled={index > activeIndex}
                onClick={() => {
                  if (index <= activeIndex) setActiveIndex(index);
                }}
                className={`flex items-center gap-2 rounded-[30px] px-4 py-1.5 font-cta text-sm uppercase tracking-wide disabled:cursor-not-allowed ${
                  isActive
                    ? "bg-onwei-blue text-onwei-beige"
                    : isComplete
                      ? "border border-onwei-blue bg-onwei-green text-onwei-blue"
                      : "border border-onwei-blue/30 bg-transparent text-onwei-blue/40"
                }`}
              >
                <span className="font-grotesk text-xs">{index + 1}</span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div>{activeStep?.content}</div>

      <div className="flex items-center gap-2">
        {activeIndex > 0 ? (
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </AdminButton>
        ) : null}
        {!isLastStep ? (
          <AdminButton
            type="button"
            disabled={activeStep?.canAdvance === false}
            onClick={() =>
              setActiveIndex((i) => Math.min(steps.length - 1, i + 1))
            }
          >
            Next
          </AdminButton>
        ) : (
          <AdminButton type="submit" disabled={submitDisabled}>
            {submitLabel}
          </AdminButton>
        )}
      </div>
    </div>
  );
}
