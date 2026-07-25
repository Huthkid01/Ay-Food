import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const storageService = {
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured — cannot upload images');
    }
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) {
      throw new Error(error.message || 'Could not upload image');
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};
