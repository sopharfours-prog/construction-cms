import type { Messages } from "@/i18n/messages";

/**
 * Serializable subset of the auth dictionary for Client Components
 * (the reset-email builder is a function and stays on the server).
 */
export type AuthLabels = Omit<Messages["auth"], "resetEmail">;

export function toAuthLabels(auth: Messages["auth"]): AuthLabels {
  const { resetEmail: _unused, ...labels } = auth;
  return labels;
}
