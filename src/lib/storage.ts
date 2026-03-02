import { Platform } from 'react-native';
import { supabase } from './supabase';
import { STORAGE } from './constants';

export async function uploadAudio(
  userId: string,
  affirmationId: string,
  localUri: string
): Promise<string> {
  let fileData: ArrayBuffer;
  let contentType = STORAGE.audioContentType;
  let extension = STORAGE.audioExtension;

  if (Platform.OS === 'web') {
    // On web, recorder.uri is a blob URL — fetch the blob directly
    const response = await fetch(localUri);
    const blob = await response.blob();
    fileData = await blob.arrayBuffer();
    // Web MediaRecorder uses webm format
    contentType = 'audio/webm';
    extension = '.webm';
  } else {
    const { File } = require('expo-file-system');
    const file = new File(localUri);
    fileData = await file.arrayBuffer();
  }

  const path = `${userId}/${affirmationId}${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE.audioBucket)
    .upload(path, fileData, {
      contentType,
      upsert: true,
    });

  if (error) throw error;
  return path;
}

export async function getAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE.audioBucket)
    .createSignedUrl(path, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAudio(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE.audioBucket)
    .remove([path]);

  if (error) throw error;
}
