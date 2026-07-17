/** Shared types for the Send suite (claim links, requests, recurring, metadata). */

export type SendMetadata = {
  invoice?: string;
  track?: string;
  grant_id?: string;
  memo?: string;
  note?: string;
  [key: string]: string | undefined;
};

export type ConditionType =
  | "none"
  | "after_date"
  | "github_pr"
  | "url_attest"
  | "manual";

export type ConditionPayload = {
  /** ISO date for after_date / unlock_at mirror */
  unlock_at?: string;
  /** GitHub PR URL or owner/repo#number */
  github_pr?: string;
  /** External form / attestation URL */
  url?: string;
  /** Free-text milestone label (hackathon finals, etc.) */
  label?: string;
  /** Set true when organizer/oracle marks condition satisfied */
  satisfied?: boolean;
};

export type PaymentRequestStatus = "open" | "paid" | "cancelled" | "expired";

export type PaymentRequest = {
  id: string;
  requester_user_id: string | null;
  requester_wallet: string;
  requester_username: string | null;
  payer_user_id: string | null;
  payer_wallet: string | null;
  payer_username: string | null;
  amount: number;
  token: string;
  message: string | null;
  metadata: SendMetadata;
  status: PaymentRequestStatus;
  deposit_id: string | null;
  expires_at: string | null;
  created_at: string;
  paid_at: string | null;
};

export type RecurringSend = {
  id: string;
  sender_user_id: string | null;
  sender_wallet: string;
  recipient_wallet: string;
  recipient_user_id: string | null;
  recipient_username: string | null;
  amount: number;
  token: string;
  interval_days: number;
  next_run_at: string;
  active: boolean;
  message: string | null;
  metadata: SendMetadata;
  last_deposit_id: string | null;
  created_at: string;
};

export type BatchRecipientLine = {
  to: string;
  amount: string;
  note?: string;
};
