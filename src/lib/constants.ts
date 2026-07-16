/** Paid Backdoor unlock price (MON). Free open available when BACKDOOR_OPEN_FOR_TEST. */
export const BACKDOOR_PRICE_MON = 1000;
/** @deprecated use BACKDOOR_PRICE_MON */
export const PRIVATE_VIEW_PRICE_MON = BACKDOOR_PRICE_MON;

/**
 * When true, Backdoor can be opened without paying (testnet / product testing).
 * Set NEXT_PUBLIC_BACKDOOR_OPEN=false to require paid unlock only.
 */
export const BACKDOOR_OPEN_FOR_TEST =
  process.env.NEXT_PUBLIC_BACKDOOR_OPEN !== "false";

/** App identity */
export const APP_NAME = "Anonym";
export const APP_TAGLINE = "Private Payments. Private Fundraising. Built on Monad.";

/** SIWE domain/statement */
export const SIWE_STATEMENT =
  "Sign in to Anonym. This proves wallet ownership and does not send a transaction.";
