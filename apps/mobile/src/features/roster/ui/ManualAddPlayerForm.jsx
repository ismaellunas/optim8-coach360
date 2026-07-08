import { useState } from 'react';
import { Button as Btn, Card, Field } from '@/shared/ui/primitives.jsx';

export function ManualAddPlayerForm({ submitting, error, onSubmit }) {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice(null);
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }
    try {
      await onSubmit(trimmed);
      setEmail('');
      setNotice('Player added to your roster.');
    } catch {
      setNotice(null);
    }
  }

  return (
    <Card className="mt-4 p-4">
      <p className="font-display text-sm font-semibold uppercase tracking-wider text-coach-t1">
        Manually add player
      </p>
      <p className="mt-1 font-body text-xs text-coach-t3">
        Add an existing Coach360 player by email. If they are not on the platform yet, share an
        invite link instead.
      </p>
      <form onSubmit={handleSubmit} className="mt-3">
        <Field
          id="manual-add-player-email"
          label="Player email"
          type="email"
          placeholder="player@example.com"
          value={email}
          onChange={function (event) {
            setEmail(event.target.value);
          }}
        />
        {error ? <p className="mb-3 font-body text-sm text-coach-red">{error}</p> : null}
        {notice ? <p className="mb-3 font-body text-sm text-coach-green">{notice}</p> : null}
        <Btn full disabled={submitting || !email.trim()} type="submit">
          {submitting ? 'Adding…' : 'Add player'}
        </Btn>
      </form>
    </Card>
  );
}
