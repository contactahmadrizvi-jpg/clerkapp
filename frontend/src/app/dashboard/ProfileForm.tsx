"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

// ─── Validation schema (mirrors backend updateBodySchema) ─────────────────────

const schema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(64, "Max 64 characters")
    .regex(/^[\p{L}\p{M}' -]+$/u, "First name contains invalid characters"),
  lastName: z
    .string()
    .trim()
    .max(64, "Max 64 characters")
    .regex(/^[\p{L}\p{M}' -]*$/u, "Last name contains invalid characters")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initialFirstName?: string;
  initialLastName?: string;
}

export default function ProfileForm({ initialFirstName = "", initialLastName = "" }: Props) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: initialFirstName, lastName: initialLastName },
  });

  async function onSubmit(values: FormValues) {
    setStatus("saving");
    setServerError("");

    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Show Zod validation errors from the server if any
        const msg =
          data?.errors?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join(", ") ||
          data?.error ||
          "Failed to update profile";
        setServerError(msg);
        setStatus("error");
        return;
      }

      setStatus("success");
      // Reset to "not dirty" with new values
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setServerError("Network error — please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            className={`form-input ${errors.firstName ? "border-red-400 focus:ring-red-100" : ""}`}
            placeholder="Ahmad"
            autoComplete="given-name"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="form-error">
              <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
              {errors.firstName.message}
            </p>
          )}
        </div>

        {/* Last name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5" htmlFor="lastName">
            Last name <span className="text-gray-300">(optional)</span>
          </label>
          <input
            id="lastName"
            className={`form-input ${errors.lastName ? "border-red-400 focus:ring-red-100" : ""}`}
            placeholder="Hassan"
            autoComplete="family-name"
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="form-error">
              <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Server-level error */}
      {status === "error" && serverError && (
        <p className="form-error text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
          {serverError}
        </p>
      )}

      {/* Success feedback */}
      {status === "success" && (
        <p className="text-sm text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
          <CheckCircleIcon className="w-4 h-4" />
          Profile updated successfully
        </p>
      )}

      <button
        type="submit"
        disabled={!isDirty || status === "saving"}
        className="btn-primary !w-auto px-6 py-2.5 text-sm"
      >
        {status === "saving" ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Saving…
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </form>
  );
}
