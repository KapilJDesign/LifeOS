export declare const DEFAULT_APP_URL: string;
export declare const MAX_TEXT_LENGTH: number;

export interface CapturePayload {
  url?: string;
  title?: string;
  text?: string;
  note?: string;
}

export declare function normalizeAppUrl(value?: string): string;
export declare function buildCaptureUrl(appUrl: string, payload?: CapturePayload): string;
export declare function isCapturablePage(url?: string): boolean;
