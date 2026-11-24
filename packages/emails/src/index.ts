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
  createInsiderEmailSender,
  sendEmailSafely,
} from "./sender/emailSender";
export type { EmailSender } from "./sender/emailSender";
export {
  renderOrderConfirmationEmail,
  renderNewOrderAlertEmail,
  renderOrderDeliveredEmail,
  renderOrderShippedEmail,
} from "./templates/orderEmails";
export type {
  OrderDeliveryEmailInput,
  OrderEmailInput,
} from "./templates/orderEmails";
export { renderContactAlertEmail } from "./templates/contactEmails";
export type { ContactAlertInput } from "./templates/contactEmails";
export {
  renderPreorderReservedEmail,
  renderPreorderBalanceEmail,
  renderPreorderCreditEmail,
  rupeesText,
} from "./templates/preorderEmails";
export type {
  PreorderEmailInput,
  PreorderCreditEmailInput,
} from "./templates/preorderEmails";
