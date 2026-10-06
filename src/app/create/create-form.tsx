"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { PropertyTypePicker } from "@/components/editor/property-type-picker";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { trackOncePerSession } from "@/lib/analytics/client";
import type { PropertyType } from "@/lib/data/types";
import { createPropertyAction, type CreateState } from "./actions";

export function CreateForm() {
  const [state, action, pending] = useActionState<CreateState, FormData>(createPropertyAction, {});
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [type, setType] = useState<PropertyType>("house");

  useEffect(() => {
    trackOncePerSession("create_started");
  }, []);

  return (
    <form action={action} className="space-y-6">
      <Field label="Property name" hint="Just for you — something like “Maple Street house”.">
        {(p) => (
          <Input
            {...p}
            name="name"
            required
            maxLength={120}
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!titleEdited) setTitle(e.target.value);
            }}
            placeholder="Maple Street house"
          />
        )}
      </Field>

      <Field label="Address" optional hint="Shown on the tour page. Leave blank to keep it private.">
        {(p) => <Input {...p} name="address" maxLength={200} autoComplete="street-address" placeholder="123 Maple St, Chicago, IL" />}
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-2">Property type</p>
        <PropertyTypePicker value={type} onChange={setType} name="propertyType" />
      </div>

      <Field label="Tour title" hint="This is the headline visitors see.">
        {(p) => (
          <Input
            {...p}
            name="tourTitle"
            maxLength={140}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleEdited(true);
            }}
            placeholder="Modern 3-Bedroom Chicago Home"
          />
        )}
      </Field>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending} disabled={!name.trim()}>
        Continue to floor plan
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
