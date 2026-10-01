// Inline validation message shown directly under the field it belongs to.
// Pair with `aria-invalid` and `aria-describedby={id}` on the input.
export function FieldError({
  id,
  message,
  inset = true,
}: {
  id: string;
  message?: string;
  inset?: boolean;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={`flex items-start gap-1.5 ${inset ? "px-5" : ""} font-grotesk text-[length:max(0.8125rem,11px)] font-medium leading-[1.3] text-[#b91c1c]`}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="mt-[0.1em] size-[1em] shrink-0 fill-current"
      >
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm-.75 4h1.5v5h-1.5V4Zm.75 8.25a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
      </svg>
      <span>{message}</span>
    </p>
  );
}

export const INVALID_BORDER = "border-[#b91c1c] ring-1 ring-[#b91c1c]";
