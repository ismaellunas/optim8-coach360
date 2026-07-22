import { useEffect, useRef, useState } from 'react';
import {
  DISABLED_CHAT_MESSAGE_TYPES,
  disabledChatMessageTooltip,
} from '@coach360/domain';
import { useRepositories } from '@coach360/api';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

function AttachRow({ label, testId, disabled, title, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title || label}
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      className={`mb-0 flex w-full cursor-pointer items-center justify-between border-0 border-b border-solid border-coach-border bg-transparent py-4 text-left ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
    >
      <span className="font-body text-sm font-semibold text-coach-t1">{label}</span>
      {disabled ? (
        <span className="font-body text-[11px] text-coach-t3">Coming later</span>
      ) : (
        <span className="font-body text-[11px] text-coach-orange">Select</span>
      )}
    </button>
  );
}

export function ChatAttachMenu({
  onBack,
  onPickContentLink,
  onPickVideoFile,
}) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;
  const videoInputRef = useRef(null);

  const [mode, setMode] = useState('menu');
  const [pickerTab, setPickerTab] = useState('library');
  const [libraryItems, setLibraryItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(
    function () {
      if (mode !== 'content' || !userId) {
        return;
      }
      let cancelled = false;
      (async function () {
        setLoading(true);
        setError(null);
        try {
          const [libraryRows, purchaseRows] = await Promise.all([
            repos.library.listCoachLibrary(userId),
            repos.library.listPurchasedContent(userId),
          ]);
          if (cancelled) {
            return;
          }
          setLibraryItems(libraryRows ?? []);
          setPurchasedItems(purchaseRows ?? []);
        } catch (cause) {
          if (!cancelled) {
            setError(cause instanceof Error ? cause.message : 'chat_content_picker_failed');
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return function () {
        cancelled = true;
      };
    },
    [mode, repos.library, userId],
  );

  if (mode === 'content') {
    const pickerItems = pickerTab === 'library' ? libraryItems : purchasedItems;
    return (
      <ScreenContainer data-testid="chat-content-picker">
        <PageHeader
          title="ATTACH CONTENT"
          onBack={function () {
            setMode('menu');
            setError(null);
          }}
        />
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={function () {
              setPickerTab('library');
            }}
            className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wider ${pickerTab === 'library' ? 'border-coach-orange bg-coach-orange text-white' : 'border-coach-border bg-coach-card text-coach-t2'}`}
          >
            Library
          </button>
          <button
            type="button"
            onClick={function () {
              setPickerTab('purchased');
            }}
            className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wider ${pickerTab === 'purchased' ? 'border-coach-orange bg-coach-orange text-white' : 'border-coach-border bg-coach-card text-coach-t2'}`}
          >
            Purchased
          </button>
        </div>
        {error ? <p className="mb-3 font-body text-xs text-coach-red">{error}</p> : null}
        {loading ? <p className="font-body text-sm text-coach-t3">Loading content…</p> : null}
        {!loading && pickerItems.length === 0 ? (
          <p className="font-body text-sm text-coach-t3">
            {pickerTab === 'library' ? 'No library items yet.' : 'No purchased packages yet.'}
          </p>
        ) : null}
        {pickerItems.map(function (item) {
          return (
            <button
              key={`${item.source}:${item.id}`}
              type="button"
              data-testid="chat-content-picker-item"
              onClick={function () {
                onPickContentLink({
                  kind: item.kind,
                  source: item.source,
                  id: item.id,
                  title: item.title,
                });
              }}
              className="mb-0 flex w-full cursor-pointer flex-col gap-1 border-0 border-b border-solid border-coach-border bg-transparent py-3.5 text-left"
            >
              <span className="font-body text-sm font-semibold text-coach-t1">{item.title}</span>
              <span className="font-body text-[12px] uppercase text-coach-t3">
                {item.kind} · {item.source}
              </span>
            </button>
          );
        })}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer data-testid="chat-attach-menu">
      <PageHeader title="ATTACH" onBack={onBack} />
      <p className="mb-2 font-body text-[13px] text-coach-t3">
        Add a drill link or video to this message.
      </p>
      <AttachRow
        label="Drill / content link"
        testId="chat-attach-content-link"
        onClick={function () {
          setMode('content');
        }}
      />
      <AttachRow
        label="Video"
        testId="chat-attach-video"
        onClick={function () {
          videoInputRef.current?.click();
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        data-testid="chat-video-file-input"
        onChange={function (event) {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onPickVideoFile(file);
          }
        }}
      />
      {DISABLED_CHAT_MESSAGE_TYPES.map(function (type) {
        const tooltip = disabledChatMessageTooltip(type);
        return (
          <AttachRow
            key={type}
            label={type === 'image' ? 'Image' : 'Voice note'}
            testId={`chat-attach-${type}-disabled`}
            disabled
            title={tooltip}
          />
        );
      })}
    </ScreenContainer>
  );
}
