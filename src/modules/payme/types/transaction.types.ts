export interface LocalizedMessage {
  uz: string;
  ru: string;
  en: string;
}

export interface PaymeErrorType {
  name: string;
  code: number;
  message: LocalizedMessage;
}
