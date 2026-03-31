/**
 * audioStorage.ts
 * ----------------
 * Service layer for audio-file operations.  Handles uploading files to
 * Supabase Storage, tracking metadata in the `audio_files` database table,
 * and exposing CRUD helpers the rest of the app can use.
 *
 * The LLM transcription / summarization pipeline is NOT implemented here —
 * we just make sure the schema supports it (transcript, summary, status).
 */

import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mirrors the `audio_files` table in Supabase. */
export interface AudioFile {
  id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  summary: string | null;
  /** Status flow: uploaded → transcribing → transcribed → summarizing → completed */
  status: string;
  created_at: string;
  updated_at: string;
}

/** Fields that can be patched via `updateAudioMetadata`. */
export interface AudioFileUpdate {
  transcript?: string;
  summary?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Name of the Supabase Storage bucket for audio files. */
const BUCKET = 'audio-uploads';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload an audio file to Supabase Storage and insert a metadata row into
 * the `audio_files` table.
 *
 * Filenames are prefixed with a timestamp to prevent collisions when
 * multiple users upload files with the same name.
 *
 * @param file - The File object selected by the user.
 * @returns The newly-created AudioFile row.
 */
export async function uploadAudio(file: File): Promise<AudioFile> {
  // 1. Build a collision-safe storage path
  const filePath = `${Date.now()}_${file.name}`;

  // 2. Upload the binary to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',       // cache for 1 hour
      upsert: false,              // never overwrite an existing file
      contentType: file.type,     // preserve the original MIME type
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // 3. Insert a metadata row in the database
  const { data, error: insertError } = await supabase
    .from('audio_files')
    .insert({
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
      status: 'uploaded',
    })
    .select()       // return the inserted row
    .single();      // we only inserted one row

  if (insertError) {
    // Best-effort cleanup: remove the orphaned file from Storage
    await supabase.storage.from(BUCKET).remove([filePath]);
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  return data as AudioFile;
}

/**
 * Fetch every audio-file row, newest first.
 *
 * @returns An array of AudioFile objects.
 */
export async function listAudioFiles(): Promise<AudioFile[]> {
  const { data, error } = await supabase
    .from('audio_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list audio files: ${error.message}`);
  }

  return (data ?? []) as AudioFile[];
}

/**
 * Get the public URL for a file stored in Supabase Storage.
 *
 * Because the `audio-uploads` bucket is public, this URL can be used
 * directly in an `<audio>` element's `src` attribute.
 *
 * @param filePath - The `file_path` value from the database row.
 * @returns A fully-qualified public URL string.
 */
export function getAudioUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete an audio file from both Storage and the database.
 *
 * @param id       - The UUID of the `audio_files` row.
 * @param filePath - The `file_path` value so we can remove the blob.
 */
export async function deleteAudio(id: string, filePath: string): Promise<void> {
  // Remove from Storage first
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (storageError) {
    throw new Error(`Storage delete failed: ${storageError.message}`);
  }

  // Then remove the database row
  const { error: dbError } = await supabase
    .from('audio_files')
    .delete()
    .eq('id', id);

  if (dbError) {
    throw new Error(`Database delete failed: ${dbError.message}`);
  }
}

/**
 * Patch specific fields on an existing audio-file row.
 *
 * Typically used to update `transcript`, `summary`, and/or `status`
 * as the LLM pipeline processes the file.
 *
 * @param id      - The UUID of the row to update.
 * @param updates - An object with the fields to change.
 * @returns The updated AudioFile row.
 */
export async function updateAudioMetadata(
  id: string,
  updates: AudioFileUpdate,
): Promise<AudioFile> {
  const { data, error } = await supabase
    .from('audio_files')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Metadata update failed: ${error.message}`);
  }

  return data as AudioFile;
}
