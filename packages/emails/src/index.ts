export { renderOtpEmail } from "./templates/otpEmail";
export type { RenderedEmail } from "./templates/otpEmail";
export { renderWaitlistWelcomeEmail } from "./templates/waitlistWelcomeEmail";
export type { WaitlistWelcomeInput } from "./templates/waitlistWelcomeEmail";
export { renderInsiderCodeEmail } from "./templates/insiderCodeEmail";
export type { InsiderCodeEmailInput } from "./templates/insiderCodeEmail";
export { renderCustomerWelcomeEmail } from "./templates/customerWelcomeEmail";
export type { CustomerWelcomeInput } from "./templates/customerWelcomeEmail";
export {
  ConsoleEmailSender,
  ResendEmailSender,
  createEmailSender,
  sendEmailSafely,
} from "./sender/emailSender";
export type { EmailSender } from "./sender/emailSender";
export {
  renderOrderConfirmationEmail,
  renderNewOrderAlertEmail,
} from "./templates/orderEmails";
export type { OrderEmailInput } from "./templates/orderEmails";
