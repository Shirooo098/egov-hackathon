export type AccountRole =
  | "citizen"
  | "coordinator"
  | "doctor"
  | "clinical_lead"
  | "hospital_admin"
  | "scheduler"
  | "supervisor";
export interface Account {
  id?: string;
  role: AccountRole | string;
  [key: string]: unknown;
}
export interface Session {
  account: Account;
}
export interface ApiResponse {
  success?: boolean;
  account?: Account;
  message?: string;
  error?: string;
  [key: string]: unknown;
}
export interface ToastOptions {
  duration?: number;
  title?: string;
  variant?: string;
  [key: string]: unknown;
}
export type ToastType = "success" | "error" | "warning" | "info" | "emessage";
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  options: ToastOptions;
}
