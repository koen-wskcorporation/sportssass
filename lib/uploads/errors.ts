export type UploadErrorCode =
  | "unsupported_file_type"
  | "file_too_large"
  | "storage_not_configured"
  | "storage_upload_failed";

export class UploadError extends Error {
  code: UploadErrorCode;

  constructor(code: UploadErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "UploadError";
  }
}

export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError;
}
