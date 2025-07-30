"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Step {
  id: string
  title: string
  subtitle?: string
}

interface HorizontalStepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function HorizontalStepper({ steps, currentStep, className }: HorizontalStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle and Content */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                    isCompleted && "bg-green-500 text-white shadow-md",
                    isCurrent && "bg-blue-600 text-white shadow-lg ring-4 ring-blue-100",
                    isPending && "bg-gray-200 text-gray-500",
                  )}
                >
                  {isCompleted ? <Check className="w-2.5 h-2.5" /> : stepNumber}
                </div>

                {/* Step Info */}
                <div className="mt-1.5 text-center">
                  <div
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent && "text-blue-600",
                      isCompleted && "text-green-600",
                      isPending && "text-gray-500",
                    )}
                  >
                    {step.title}
                  </div>
                  {step.subtitle && (
                    <div
                      className={cn(
                        "text-[0.625rem] mt-1 transition-colors",
                        isCurrent && "text-blue-500",
                        isCompleted && "text-green-500",
                        isPending && "text-gray-400",
                      )}
                    >
                      {step.subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 mt-[-1rem]">
                  <div
                    className={cn(
                      "h-0.5 transition-colors duration-300",
                      stepNumber < currentStep ? "bg-green-500" : "bg-gray-200",
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <div key={step.id} className="flex items-start">
              {/* Left side - Circle and connector */}
              <div className="flex flex-col items-center mr-4">
                {/* Circle */}
                <div
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                    isCompleted && "bg-green-500 text-white shadow-md",
                    isCurrent && "bg-blue-600 text-white shadow-lg ring-4 ring-blue-100",
                    isPending && "bg-gray-200 text-gray-500",
                  )}
                >
                  {isCompleted ? <Check className="w-2 h-2" /> : stepNumber}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 h-4 mt-1 transition-colors duration-300",
                      stepNumber < currentStep ? "bg-green-500" : "bg-gray-200",
                    )}
                  />
                )}
              </div>

              {/* Right side - Step Info */}
              <div className="flex-1 pb-2">
                <div
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isCurrent && "text-blue-600",
                    isCompleted && "text-green-600",
                    isPending && "text-gray-500",
                  )}
                >
                  {step.title}
                </div>
                {step.subtitle && (
                  <div
                    className={cn(
                      "text-[0.625rem] mt-1 transition-colors",
                      isCurrent && "text-blue-500",
                      isCompleted && "text-green-500",
                      isPending && "text-gray-400",
                    )}
                  >
                    {step.subtitle}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}