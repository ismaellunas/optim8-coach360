const ROLES = [
  { id: 'coach', label: 'Coach', desc: 'Plan, create, and lead', emoji: '\uD83C\uDFC0' },
  { id: 'player', label: 'Player', desc: 'Train and improve', emoji: '\u26F9\uFE0F' },
  { id: 'team_manager', label: 'Team Manager', desc: 'Manage roster and team ops', emoji: '\uD83D\uDCCB' },
];

function IconChev() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function RoleSelectScreen({ selectedRole, onSelect, onContinue, onBack }) {
  return (
    <div className="px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-coach-orange"
      >
        <IconBack />
        <span className="font-body text-[13px]">Back</span>
      </button>
      <div className="mb-6 font-display text-2xl font-bold text-coach-t1">SELECT YOUR ROLE</div>
      {ROLES.map(function (role) {
        const isSelected = selectedRole === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={function () { onSelect(role.id); }}
            className={`mb-2.5 flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] border bg-coach-card p-4 text-left ${
              isSelected ? 'border-2 border-coach-orange' : 'border-coach-border'
            }`}
          >
            <div className="text-[28px]">{role.emoji}</div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold text-coach-t1">{role.label}</div>
              <div className="font-body text-xs text-coach-t3">{role.desc}</div>
            </div>
            <IconChev />
          </button>
        );
      })}
      <button
        type="button"
        disabled={!selectedRole}
        onClick={onContinue}
        className={[
          'mt-4 w-full rounded-xl border-none px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider',
          selectedRole
            ? 'cursor-pointer bg-coach-orange text-white'
            : 'cursor-default bg-coach-border text-coach-t3 opacity-50',
        ].join(' ')}
      >
        Continue
      </button>
    </div>
  );
}
