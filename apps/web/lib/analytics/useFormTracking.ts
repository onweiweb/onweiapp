"use client";

import { useCallback, useEffect, useRef } from "react";
import { track } from "./track";

/**
 * Field-by-field tracking for any form, so "where do people give up" can be
 * answered per form. `fields` is the form's fields in on-screen order, and
 * must be a constant (declared outside the component).
 * Only field names go out, never what was typed.
 *
 *   const form = useFormTracking("waitlist", ["name", "email", "phone"]);
 *   <input onFocus={() => form.focus("name")} onBlur={() => form.blur("name", Boolean(value))} />
 *
 * Reports "form_abandoned" once, with the last field touched, if the person
 * leaves the page after starting but before a successful submit. Someone who
 * switches tabs and later finishes is dropped from the abandoned count by
 * the report (it ignores visits that also have a "submit_success").
 */
export function useFormTracking(formName: string, fields: readonly string[]) {
  const started = useRef(false);
  const finished = useRef(false);
  const abandonedSent = useRef(false);
  const lastField = useRef<string | null>(null);
  const completed = useRef(new Set<string>());

  const focus = useCallback(
    (field: string) => {
      if (!started.current) {
        started.current = true;
        track("form_started", { form_name: formName });
      }
      lastField.current = field;
      track("field_focused", {
        form_name: formName,
        field,
        field_index: fields.indexOf(field),
      });
    },
    [formName, fields],
  );

  const blur = useCallback(
    (field: string, hasValue: boolean) => {
      if (!hasValue || completed.current.has(field)) return;
      completed.current.add(field);
      track("field_completed", {
        form_name: formName,
        field,
        field_index: fields.indexOf(field),
      });
    },
    [formName, fields],
  );

  const fieldError = useCallback(
    (field: string, error: string) => {
      track("field_error", {
        form_name: formName,
        field,
        field_index: fields.indexOf(field),
        error,
      });
    },
    [formName, fields],
  );

  const submitAttempt = useCallback(() => {
    track("submit_attempt", { form_name: formName });
  }, [formName]);

  const submitSuccess = useCallback(() => {
    finished.current = true;
    track("submit_success", { form_name: formName });
  }, [formName]);

  const submitFailed = useCallback(
    (error: string) => {
      track("submit_failed", { form_name: formName, error });
    },
    [formName],
  );

  useEffect(() => {
    const report = () => {
      if (
        started.current &&
        !finished.current &&
        !abandonedSent.current &&
        lastField.current
      ) {
        abandonedSent.current = true;
        track("form_abandoned", {
          form_name: formName,
          last_field: lastField.current,
        });
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") report();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", report);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", report);
      report();
    };
  }, [formName]);

  return {
    focus,
    blur,
    fieldError,
    submitAttempt,
    submitSuccess,
    submitFailed,
  };
}
