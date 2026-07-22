const CONTENT_ERROR_COPY: Record<string, string> = {
  title_required: 'Enter a title.',
  instructions_required: 'Enter instructions for this drill.',
  package_items_required: 'Select at least one library item for the package.',
  library_create_failed: 'Could not save content. Try again.',
  library_package_failed: 'Could not create the package. Try again.',
  mux_initiate_failed: 'Could not start video upload. Try again.',
  mux_credentials_missing: 'Video upload is not configured. Contact support.',
  mux_upload_put_failed: 'Video file upload failed. Try again.',
  video_too_large: 'Video is too large. Use a file under 500 MB.',
  video_file_required: 'Select a video file to upload.',
  video_type_invalid: 'Choose a video file (MP4, MOV, or similar).',
  mux_transcode_failed: 'Video processing failed. Try uploading again.',
  media_upload_failed: 'Could not upload media. Try again.',
  unauthorized: 'Sign in again to create content.',
};

export function mapContentError(codeOrMessage: string): string {
  const key = codeOrMessage.split(':')[0]?.trim() || codeOrMessage;
  return CONTENT_ERROR_COPY[key] || CONTENT_ERROR_COPY[codeOrMessage] || codeOrMessage;
}
