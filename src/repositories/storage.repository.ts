import { supabase } from "../utils/supabase.client.js";
import { STORAGE_BUCKETS, CONTENT_TYPES } from "../constants/storage.constants.js";

export class StorageRepository {
  async uploadFile(fileName: string, data: string): Promise<void> {
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.IMPORTS).upload(fileName, data, {
      contentType: CONTENT_TYPES.JSON,
    });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(fileName: string): Promise<string> {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.IMPORTS).download(fileName);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new Error("File not found");
    }

    return await data.text();
  }

  async deleteFile(fileName: string): Promise<void> {
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.IMPORTS).remove([fileName]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
