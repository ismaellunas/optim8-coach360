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

function FieldLabel({ children }) {
  return <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">{children}</div>;
}

function readOptionalDate(form, fieldId) {
  const raw = form.elements.namedItem(fieldId)?.value?.trim() ?? '';
  return raw || null;
}

function TextInput({ id, name, type = 'text', required, min, max, defaultValue, placeholder }) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      min={min}
      max={max}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
    />
  );
}

export function TeamProfileForm({
  mode = 'create',
  initialTeam = null,
  canManageAgeRange = false,
  submitting = false,
  error = null,
  onSubmit,
  onCancel,
}) {
  const nameId = 'team-profile-name';
  const descriptionId = 'team-profile-description';
  const ageMinId = 'team-profile-age-min';
  const ageMaxId = 'team-profile-age-max';
  const gradeLevelId = 'team-profile-grade-level';
  const divisionId = 'team-profile-division';
  const seasonStartId = 'team-profile-season-start';
  const seasonEndId = 'team-profile-season-end';
  const logoId = 'team-profile-logo';

  const [logoName, setLogoName] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(initialTeam?.logoUrl ?? null);

  const title = mode === 'edit' ? 'EDIT TEAM' : 'CREATE TEAM';
  const subtitle = canManageAgeRange
    ? mode === 'edit'
      ? 'Update team profile, age range, grade level, and division.'
      : 'Create your team profile including age range, grade level, and division. Invite players from Roster after your team exists.'
    : mode === 'edit'
      ? 'Update team name, logo, and season dates. Age range is managed by your team manager.'
      : 'Set up your team name, logo, and season dates.';

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.namedItem(nameId)?.value?.trim() ?? '';
    const description = form.elements.namedItem(descriptionId)?.value?.trim() ?? '';
    const seasonStart = readOptionalDate(form, seasonStartId);
    const seasonEnd = readOptionalDate(form, seasonEndId);

    let ageMin = null;
    let ageMax = null;
    let gradeLevel = null;
    let division = null;

    if (canManageAgeRange) {
      const ageMinRaw = form.elements.namedItem(ageMinId)?.value ?? '';
      const ageMaxRaw = form.elements.namedItem(ageMaxId)?.value ?? '';
      const gradeLevelRaw = form.elements.namedItem(gradeLevelId)?.value?.trim() ?? '';
      const divisionRaw = form.elements.namedItem(divisionId)?.value?.trim() ?? '';
      ageMin = ageMinRaw === '' ? null : Number.parseInt(ageMinRaw, 10);
      ageMax = ageMaxRaw === '' ? null : Number.parseInt(ageMaxRaw, 10);
      gradeLevel = gradeLevelRaw || null;
      division = divisionRaw || null;
    } else if (mode === 'edit' && initialTeam) {
      ageMin = initialTeam.ageMin;
      ageMax = initialTeam.ageMax;
      gradeLevel = initialTeam.gradeLevel;
      division = initialTeam.division;
    }

    if (!name) {
      return;
    }

    await onSubmit(
      {
        name,
        description: description || undefined,
        ageMin: Number.isFinite(ageMin) ? ageMin : null,
        ageMax: Number.isFinite(ageMax) ? ageMax : null,
        gradeLevel,
        division,
        seasonStart,
        seasonEnd,
        logoUrl: initialTeam?.logoUrl ?? null,
      },
      logoFile ? { file: logoFile, fileName: logoFile.name } : undefined,
    );
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoName(file?.name ?? null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10">
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">{title}</div>
      <div className="mb-6 font-body text-sm text-coach-t2">{subtitle}</div>

      <div className="mb-4 flex flex-col items-center">
        {logoPreview ? (
          <img
            src={logoPreview}
            alt="Team logo preview"
            className="mb-3 h-20 w-20 rounded-full border border-coach-border object-cover"
          />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-coach-border bg-coach-card font-display text-2xl font-bold text-coach-t3">
            ?
          </div>
        )}
        <label
          htmlFor={logoId}
          className="cursor-pointer font-body text-sm font-semibold text-coach-orange"
        >
          {logoName ? logoName : 'Upload team logo (optional)'}
        </label>
        <input
          id={logoId}
          name={logoId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoChange}
        />
      </div>

      <div className="mb-3.5">
        <FieldLabel>Team name</FieldLabel>
        <TextInput
          id={nameId}
          name={nameId}
          required
          defaultValue={initialTeam?.name ?? ''}
          placeholder="e.g. U14 Eagles"
        />
      </div>

      <div className="mb-3.5">
        <FieldLabel>Description (optional)</FieldLabel>
        <textarea
          id={descriptionId}
          name={descriptionId}
          rows={3}
          defaultValue={initialTeam?.description ?? ''}
          placeholder="Team goals or notes…"
          className="box-border w-full resize-none rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
      </div>

      {canManageAgeRange ? (
        <>
          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Min age</FieldLabel>
              <TextInput
                id={ageMinId}
                name={ageMinId}
                type="number"
                min={5}
                max={99}
                defaultValue={initialTeam?.ageMin ?? ''}
                placeholder="12"
              />
            </div>
            <div>
              <FieldLabel>Max age</FieldLabel>
              <TextInput
                id={ageMaxId}
                name={ageMaxId}
                type="number"
                min={5}
                max={99}
                defaultValue={initialTeam?.ageMax ?? ''}
                placeholder="14"
              />
            </div>
          </div>

          <div className="mb-3.5">
            <FieldLabel>Grade level</FieldLabel>
            <TextInput
              id={gradeLevelId}
              name={gradeLevelId}
              defaultValue={initialTeam?.gradeLevel ?? ''}
              placeholder="e.g. 8th grade, U14"
            />
          </div>

          <div className="mb-3.5">
            <FieldLabel>Division</FieldLabel>
            <TextInput
              id={divisionId}
              name={divisionId}
              defaultValue={initialTeam?.division ?? ''}
              placeholder="e.g. Division A, Rec league"
            />
          </div>
        </>
      ) : null}

      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Season start</FieldLabel>
          <TextInput
            id={seasonStartId}
            name={seasonStartId}
            type="date"
            defaultValue={initialTeam?.seasonStart ?? ''}
          />
        </div>
        <div>
          <FieldLabel>Season end</FieldLabel>
          <TextInput
            id={seasonEndId}
            name={seasonEndId}
            type="date"
            defaultValue={initialTeam?.seasonEnd ?? ''}
          />
        </div>
      </div>

      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}

      <ProfileBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create team'}
      </ProfileBtn>
      {onCancel ? (
        <div className="mt-3">
          <ProfileBtn disabled={submitting} onClick={onCancel}>
            Cancel
          </ProfileBtn>
        </div>
      ) : null}
    </form>
  );
}
