import { useState } from 'react';
import { Badge, Button, Card } from '@coach360/ui';
import { moderatedMessageBody } from '@coach360/domain';
import {
  useAdminChatChannelsQuery,
  useAdminChatMessagesQuery,
  useAdminSetMessageHiddenMutation,
} from '@/entities/monitor/api/monitor-queries.js';

export function ChatModerationSection() {
  const channelsQuery = useAdminChatChannelsQuery();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const messagesQuery = useAdminChatMessagesQuery(selectedChannelId);
  const setHidden = useAdminSetMessageHiddenMutation();

  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-display text-lg font-semibold text-coach-t1">Chat moderation</h2>
      <p className="font-body text-sm text-coach-t2">
        Monitor channels and hide messages from members. Hidden messages stay in the admin view.
      </p>

      {channelsQuery.isLoading ? (
        <p className="text-coach-t2">Loading channels…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(channelsQuery.data ?? []).map((channel) => (
            <button
              key={channel.id}
              type="button"
              className={`rounded-[14px] border bg-coach-card p-4 text-left transition ${
                selectedChannelId === channel.id
                  ? 'border-coach-orange'
                  : 'border-coach-border hover:border-coach-orange/50'
              }`}
              onClick={() => setSelectedChannelId(channel.id)}
            >
              <p className="text-xs uppercase text-coach-t3">{channel.type}</p>
              <p className="mt-1 font-display text-base font-semibold text-coach-t1">
                {channel.title}
              </p>
              <p className="mt-1 font-body text-xs text-coach-t3">
                {channel.messageCount} messages
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedChannelId ? (
        <Card>
          <p className="font-display text-base font-semibold text-coach-t1">Channel messages</p>
          <label className="mt-3 block max-w-md">
            <span className="font-body text-xs text-coach-t3">Hide reason (optional)</span>
            <input
              type="text"
              aria-label="Moderation reason"
              className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {messagesQuery.isLoading ? (
            <p className="mt-3 text-coach-t2">Loading messages…</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(messagesQuery.data ?? []).map((message) => (
                <li
                  key={message.id}
                  className="rounded-[10px] border border-coach-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-body text-xs text-coach-t3">
                      {message.senderName ?? message.senderId}
                    </p>
                    {message.hiddenAt ? <Badge>Hidden</Badge> : null}
                  </div>
                  <p className="mt-1 font-body text-sm text-coach-t1">
                    {moderatedMessageBody(message.body, message.hiddenAt)}
                  </p>
                  <div className="mt-2">
                    <Button
                      variant={message.hiddenAt ? 'ghost' : 'primary'}
                      disabled={setHidden.isPending}
                      onClick={() =>
                        setHidden.mutate({
                          messageId: message.id,
                          hidden: !message.hiddenAt,
                          reason: reason || null,
                          channelId: message.channelId,
                        })
                      }
                    >
                      {message.hiddenAt ? 'Restore' : 'Hide'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
