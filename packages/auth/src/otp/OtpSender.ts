export type OtpChannel = "EMAIL" | "SMS";

/**
 * Vendor-abstraction interface for OTP delivery (docs/ARCHITECTURE.md).
 * The vendor is undecided (docs/OPEN_DECISIONS.md ties it to the payment
 * gateway choice — India-first e.g. MSG91, or global e.g. Twilio). Build
 * against this interface and ConsoleOtpSender below; do not implement a real
 * vendor adapter until that decision is made.
 */
export interface OtpSender {
  send(identifier: string, channel: OtpChannel, code: string): Promise<void>;
}
