import { useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  buildSessionPrefillFromLibraryItem,
  createCoachLibraryItemInputSchema,
  mapContentError,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button as Btn,
  Card,
  Field,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

const CONTENT_TYPES = [
  { id: 'drill', l: 'Training Drill', d: 'Instructions and reps' },
  { id: 'video', l: 'Video Upload', d: 'Film and demos — Mux transcoding' },
  { id: 'strategy', l: 'Game Strategy', d: 'Plays and formations' },
];

function IconChev() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

async function putVideoToMux(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });
  if (!response.ok) {
    throw new Error(`mux_upload_put_failed:http_${response.status}`);
  }
}

/**
 * Coach content authoring (STORY-9.2). Advanced+ gated by Home `createContent`.
 */
export function CreateContentScreen({
  onBack,
  onViewLibrary,
  onAttachToSession,
  onBuildPackage,
}) {
  const repos = useRepositories();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [ty, setTy] = useState(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  function resetForm() {
    setTy(null);
    setTitle('');
    setInstructions('');
    setMediaFile(null);
    setError(null);
    setCreated(null);
    setUploadStatus(null);
  }

  async function handleCreate() {
    if (!userId || !ty) {
      return;
    }
    setSaving(true);
    setError(null);
    setUploadStatus(null);
    try {
      let mediaUrl = null;
      if (ty !== 'video' && mediaFile) {
        mediaUrl = await repos.library.uploadMedia(userId, {
          file: mediaFile,
          fileName: mediaFile.name || 'media',
        });
      }

      const input = createCoachLibraryItemInputSchema.parse({
        kind: ty,
        title,
        instructions: instructions || null,
        mediaUrl,
      });

      const item = await repos.library.createItem(userId, input);

      if (ty === 'video') {
        if (!mediaFile) {
          throw new Error('Select a video file to upload.');
        }
        setUploadStatus('Starting Mux upload…');
        const initiated = await repos.library.initiateVideoUpload(userId, item.id);
        setUploadStatus('Uploading video to Mux…');
        await putVideoToMux(initiated.uploadUrl, mediaFile);
        setUploadStatus('Upload started — transcoding pending');
        setCreated({
          ...item,
          muxUploadId: initiated.uploadId,
          transcodeStatus: 'pending',
        });
      } else {
        setCreated(item);
      }
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : 'library_create_failed';
      setError(mapContentError(raw));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <ScreenContainer>
        <PageHeader title="CONTENT SAVED" onBack={onBack} />
        <Card data-testid="create-content-success">
          <div className="font-display text-base font-semibold text-coach-t1">{created.title}</div>
          <div className="mt-1 font-body text-xs uppercase text-coach-t3">{created.kind}</div>
          {created.transcodeStatus === 'pending' ? (
            <div className="mt-2 font-body text-[13px] text-coach-blue" data-testid="mux-pending-status">
              Mux transcoding initiated
            </div>
          ) : null}
          {uploadStatus ? (
            <div className="mt-1 font-body text-[12px] text-coach-t3">{uploadStatus}</div>
          ) : null}
        </Card>
        <div className="mt-3 flex flex-col gap-2">
          <Btn
            primary
            full
            data-testid="create-content-view-library"
            onClick={function () {
              onViewLibrary?.(created);
            }}
          >
            View library
          </Btn>
          <Btn
            full
            data-testid="create-content-attach-session"
            onClick={function () {
              const prefill = buildSessionPrefillFromLibraryItem(created);
              onAttachToSession?.(prefill);
            }}
          >
            Attach to session
          </Btn>
          <Btn
            full
            data-testid="create-content-build-package"
            onClick={function () {
              onBuildPackage?.(created);
            }}
          >
            Add to package
          </Btn>
          <Btn full onClick={resetForm}>
            Create another
          </Btn>
        </div>
      </ScreenContainer>
    );
  }

  if (!ty) {
    return (
      <ScreenContainer>
        <PageHeader title="CREATE CONTENT" onBack={onBack} />
        {CONTENT_TYPES.map(function (t) {
          return (
            <Card
              key={t.id}
              data-testid={`create-content-type-${t.id}`}
              onClick={function () {
                setTy(t.id);
                setError(null);
              }}
              className="flex items-center gap-3.5"
            >
              <div className="flex-1">
                <div className="font-display text-base font-semibold text-coach-t1">{t.l}</div>
                <div className="font-body text-xs text-coach-t3">{t.d}</div>
              </div>
              <IconChev />
            </Card>
          );
        })}
        <div className="mt-4">
          <Btn full onClick={onViewLibrary} data-testid="create-content-open-library">
            Open my library
          </Btn>
        </div>
      </ScreenContainer>
    );
  }

  const instructionsLabel = ty === 'drill' ? 'Instructions' : 'Description';

  return (
    <ScreenContainer>
      <PageHeader
        title={'NEW ' + ty.toUpperCase()}
        onBack={function () {
          setTy(null);
          setError(null);
        }}
      />
      <Field
        label="Title"
        id="create-content-title"
        placeholder="e.g. Crossover Drill"
        value={title}
        onChange={function (e) {
          setTitle(e.target.value);
        }}
      />
      <div className="mb-3.5">
        <label
          htmlFor="create-content-instructions"
          className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
        >
          {instructionsLabel}
        </label>
        <textarea
          id="create-content-instructions"
          data-testid="create-content-instructions"
          placeholder={ty === 'drill' ? 'Step-by-step instructions' : 'Notes'}
          value={instructions}
          onChange={function (e) {
            setInstructions(e.target.value);
          }}
          rows={5}
          className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
      </div>

      {ty === 'video' ? (
        <label className="mb-3.5 block cursor-pointer">
          <Card className="border-2 border-dashed border-coach-border p-8 text-center">
            <div className="mb-2 flex justify-center text-coach-t3">
              <IconPlus />
            </div>
            <div className="font-body text-[13px] text-coach-t3" data-testid="create-content-video-picker">
              {mediaFile ? mediaFile.name : 'Tap to upload video'}
            </div>
          </Card>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={function (e) {
              setMediaFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>
      ) : (
        <label className="mb-3.5 block cursor-pointer">
          <Card className="border-2 border-dashed border-coach-border p-6 text-center">
            <div className="font-body text-[13px] text-coach-t3" data-testid="create-content-media-picker">
              {mediaFile ? mediaFile.name : 'Optional media (image or file)'}
            </div>
          </Card>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={function (e) {
              setMediaFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>
      )}

      {error ? (
        <p className="mb-3 font-body text-sm text-coach-red" data-testid="create-content-error">
          {error}
        </p>
      ) : null}

      <Btn
        primary
        full
        disabled={saving}
        data-testid="create-content-submit"
        onClick={handleCreate}
      >
        {saving ? 'Saving…' : 'Save to library'}
      </Btn>
    </ScreenContainer>
  );
}
