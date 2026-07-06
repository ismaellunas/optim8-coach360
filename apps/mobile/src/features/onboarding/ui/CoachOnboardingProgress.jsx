export function CoachOnboardingProgress({ stepIndex, stepCount }) {
  return (
    <div className="mb-8 flex justify-center gap-1.5" data-testid="coach-onboarding-progress">
      {Array.from({ length: stepCount }).map(function (_, index) {
        return (
          <div
            key={index}
            className={`h-1 w-10 rounded-sm ${index <= stepIndex ? 'bg-coach-orange' : 'bg-coach-border'}`}
          />
        );
      })}
    </div>
  );
}
