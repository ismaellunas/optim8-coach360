import { useState } from 'react';

function ProfileBtn({ children, primary, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={[
        'w-full rounded-xl border-none px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider',
        disabled ? 'cursor-default bg-coach-border text-coach-t3 opacity-50' : 'cursor-pointer',
        !disabled && primary ? 'bg-coach-orange text-white' : '',
        !disabled && !primary ? 'bg-coach-orange-glow text-coach-orange' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

const POSITIONS = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];

export function PlayerProfileForm({ submitting, error, onSubmit }) {
  const ageId = 'player-profile-age';
  const positionId = 'player-profile-position';
  const [photoName, setPhotoName] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const ageValue = form.elements.namedItem(ageId).value;
    const position = form.elements.namedItem(positionId).value.trim();
    const age = Number.parseInt(ageValue, 10);
    if (!Number.isFinite(age)) return;

    await onSubmit({
      age,
      position,
      photoFile,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10">
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">PLAYER PROFILE</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        Tell us about yourself to personalize training.
      </div>
      <div className="mb-3.5">
        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Age</div>
        <input
          id={ageId}
          name={ageId}
          type="number"
          required
          min={5}
          max={99}
          placeholder="Your age"
          className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
      </div>
      <div className="mb-3.5">
        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Position</div>
        <input
          id={positionId}
          name={positionId}
          type="text"
          required
          list="player-positions"
          placeholder="e.g. Point Guard"
          className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
        <datalist id="player-positions">
          {POSITIONS.map(function (position) {
            return <option key={position} value={position} />;
          })}
        </datalist>
      </div>
      <div className="mb-5">
        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Photo (optional)</div>
        <label className="block cursor-pointer rounded-[14px] border-2 border-dashed border-coach-border bg-coach-card p-8 text-center">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={function (event) {
              const file = event.target.files?.[0] ?? null;
              setPhotoFile(file);
              setPhotoName(file?.name ?? null);
            }}
          />
          <div className="font-body text-[13px] text-coach-t3">
            {photoName ? photoName : 'Tap to upload a profile photo'}
          </div>
        </label>
      </div>
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <ProfileBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Continue'}
      </ProfileBtn>
    </form>
  );
}
