import {
  isAchievementAttachment,
  isContentLinkAttachment,
  isInsightAttachment,
  isVideoAttachment,
} from '@coach360/domain';
import { SessionVideoPlayer } from '@/features/session/ui/SessionVideoPlayer.jsx';
import { Badge, Card } from '@/shared/ui/primitives.jsx';

function formatMessageTime(iso) {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatMessageBubble({ message, isMe, onContentLinkClick }) {
  const attachment = message.attachment;
  const isLink = message.messageType === 'content_link' && isContentLinkAttachment(attachment);
  const isVideo = message.messageType === 'video' && isVideoAttachment(attachment);
  const isAchievement =
    message.messageType === 'achievement' && isAchievementAttachment(attachment);
  const isInsight = message.messageType === 'insight' && isInsightAttachment(attachment);
  const isCard = isLink || isVideo || isAchievement || isInsight;
  const bubbleTone = isMe
    ? 'rounded-br rounded-bl-2xl bg-coach-orange'
    : 'rounded-bl rounded-br-2xl bg-coach-card';
  const textTone = isMe ? 'text-white' : 'text-coach-t1';
  const metaTone = isMe ? 'text-white/60' : 'text-coach-t3';

  return (
    <div className={`mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCard ? '' : `rounded-2xl px-3.5 py-2.5 ${bubbleTone}`}`}>
        {isLink ? (
          <div data-testid="chat-content-link-card">
            <Card
              className="mb-0"
              onClick={function () {
                onContentLinkClick?.(attachment);
              }}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="blue">{attachment.kind}</Badge>
                <span className="font-body text-[11px] uppercase text-coach-t3">{attachment.source}</span>
              </div>
              <div className="font-body text-sm font-semibold text-coach-t1">{attachment.title}</div>
              <div className="mt-1 font-body text-[11px] text-coach-orange">Open content</div>
            </Card>
          </div>
        ) : null}

        {isVideo ? (
          <div
            className={`overflow-hidden rounded-2xl ${bubbleTone} p-2`}
            data-testid="chat-video-attachment"
          >
            <SessionVideoPlayer src={attachment.url} title={attachment.fileName || 'Chat video'} />
            {message.body ? (
              <div className={`mt-2 px-1 font-body text-sm leading-snug ${textTone}`}>{message.body}</div>
            ) : null}
          </div>
        ) : null}

        {isAchievement ? (
          <div data-testid="chat-achievement-card">
            <Card className="mb-0 border-l-[3px] border-l-coach-orange">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="orange">Achievement</Badge>
              </div>
              <div className="font-body text-sm font-semibold text-coach-t1">{attachment.title}</div>
              {attachment.metricLabel ? (
                <div className="mt-1 font-body text-xs text-coach-t2">
                  {attachment.metricLabel}: {attachment.metricValue}
                </div>
              ) : null}
            </Card>
          </div>
        ) : null}

        {isInsight ? (
          <div data-testid="chat-insight-card">
            <Card className="mb-0 border-l-[3px] border-l-coach-blue">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="blue">Tip</Badge>
              </div>
              <div className="font-body text-sm font-semibold text-coach-t1">{attachment.title}</div>
              <div className="mt-1 font-body text-[13px] leading-relaxed text-coach-t2">
                {attachment.tip}
              </div>
            </Card>
          </div>
        ) : null}

        {!isCard ? (
          <div className={`font-body text-sm leading-snug ${textTone}`}>{message.body}</div>
        ) : null}

        {isLink && message.body && message.body !== attachment.title ? (
          <div className={`mt-2 rounded-2xl px-3.5 py-2.5 ${bubbleTone}`}>
            <div className={`font-body text-sm leading-snug ${textTone}`}>{message.body}</div>
          </div>
        ) : null}

        <div className={`mt-1 text-right font-body text-[10px] ${metaTone}`}>
          {formatMessageTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
