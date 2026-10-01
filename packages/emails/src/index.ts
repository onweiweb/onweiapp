export { renderOtpEmail } from "./templates/otpEmail";
export type { RenderedEmail } from "./templates/otpEmail";
export { renderWaitlistWelcomeEmail } from "./templates/waitlistWelcomeEmail";
export type { WaitlistWelcomeInput } from "./templates/waitlistWelcomeEmail";
export { renderCustomerWelcomeEmail } from "./templates/customerWelcomeEmail";
export type { CustomerWelcomeInput } from "./templates/customerWelcomeEmail";
export {
  ConsoleEmailSender,
  ResendEmailSender,
  createEmailSender,
  sendEmailSafely,
} from "./sender/emailSender";
export type { EmailSender } from "./sender/emailSender";
