import { createClient } from './supabase';

const BUCKET_NAME = 'photos';

/**
 * Base64画像をSupabase Storageにアップロードし、公開URLを返す
 */
export async function uploadPhoto(
  base64Data: string,
  folder: 'meals' | 'weight'
): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Base64をBlobに変換
    const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const ext = mimeType.split('/')[1] || 'jpeg';
    const raw = atob(match[2]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });

    // ファイルパス: {folder}/{userId}/{timestamp}.{ext}
    const fileName = `${folder}/${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload photo error:', err);
    return null;
  }
}
