import type { OtpChannel, OtpSender } from "./OtpSender";

/**
 * Development stand-in for OtpSender: logs the code instead of calling a
 * real SMS/email vendor. Never use this outside local development.
 */
export class ConsoleOtpSender implements OtpSender {
  async send(
    identifier: string,
    channel: OtpChannel,
    code: string,
  ): Promise<void> {
    console.log(
      `[otp:dev] would send ${channel} to ${identifier}: code=${code}`,
    );
  }
}
