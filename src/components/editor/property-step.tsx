"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import type { PropertyDTO } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { PropertyTypePicker } from "./property-type-picker";
import { useEditor } from "./store";

const AMENITY_SUGGESTIONS = [
  "In-unit laundry",
  "Parking",
  "Garage",
  "Central air",
  "Fireplace",
  "Pool",
  "Hot tub",
  "Garden",
  "Balcony",
  "Pet friendly",
  "Wi-Fi",
  "Workspace",
];

type TextKey = "name" | "tourTitle" | "address" | "description" | "neighborhood" | "contactName" | "contactCompany" | "contactEmail" | "contactPhone";
type NumberKey = "bedrooms" | "bathrooms" | "squareFeet" | "yearBuilt";

export function PropertyStep() {
  const property = useEditor((s) => s.graph.property);
  const updateProperty = useEditor((s) => s.updateProperty);
  const [draft, setDraft] = useState<PropertyDTO>(property);
  const [moreOpen, setMoreOpen] = useState(
    Boolean(property.bedrooms || property.description || property.contactName || property.amenities.length),
  );

  const commitText = (key: TextKey) => {
    const value = (draft[key] ?? "").toString().trim();
    if (value === (property[key] ?? "")) return;
    if ((key === "name" || key === "tourTitle") && !value) {
      setDraft((d) => ({ ...d, [key]: property[key] }));
      return;
    }
    void updateProperty({ [key]: value || null } as Partial<PropertyDTO>);
  };

  const commitNumber = (key: NumberKey, raw: string) => {
    const n = raw.trim() === "" ? null : Number(raw.replace(/,/g, ""));
    if (n !== null && !Number.isFinite(n)) return;
    const value = key === "squareFeet" || key === "yearBuilt" ? (n === null ? null : Math.round(n)) : n;
    setDraft((d) => ({ ...d, [key]: value }));
    if (value !== property[key]) void updateProperty({ [key]: value } as Partial<PropertyDTO>);
  };

  const text = (key: TextKey) => ({
    value: draft[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [key]: e.target.value })),
    onBlur: () => commitText(key),
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <h1 className="font-display text-4xl text-ink">Property details</h1>
      <p className="mt-2 text-[15px] text-ink-3">Only the name is required. Everything else is optional and saves as you go.</p>

      <div className="mt-8 space-y-6">
        <Field label="Property name">{(p) => <Input {...p} maxLength={120} {...text("name")} />}</Field>
        <Field label="Tour title" hint="The headline on your public tour page.">
          {(p) => <Input {...p} maxLength={140} {...text("tourTitle")} />}
        </Field>
        <Field label="Address" optional>
          {(p) => <Input {...p} maxLength={200} placeholder="123 Maple St, Chicago, IL" {...text("address")} />}
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-2">Property type</p>
          <PropertyTypePicker
            value={draft.propertyType}
            onChange={(propertyType) => {
              setDraft((d) => ({ ...d, propertyType }));
              void updateProperty({ propertyType });
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className="mt-10 flex w-full items-center justify-between rounded-2xl bg-surface px-5 py-4 text-left ring-1 ring-line transition-colors hover:bg-sunken/50"
        aria-expanded={moreOpen}
      >
        <span>
          <span className="block font-semibold text-ink">More details</span>
          <span className="text-sm text-ink-3">Beds & baths, description, amenities, contact info</span>
        </span>
        <ChevronDown className={cn("h-5 w-5 text-ink-3 transition-transform", moreOpen && "rotate-180")} />
      </button>

      {moreOpen ? (
        <div className="mt-6 animate-fade-in space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["bedrooms", "Bedrooms", "3"],
                ["bathrooms", "Bathrooms", "2.5"],
                ["squareFeet", "Square feet", "1,850"],
                ["yearBuilt", "Year built", "1998"],
              ] as const
            ).map(([key, label, ph]) => (
              <Field key={key} label={label}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="decimal"
                    placeholder={ph}
                    defaultValue={draft[key] ?? ""}
                    onBlur={(e) => commitNumber(key, e.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
          <Field label="Description" optional hint="Facts you provide here can be used in AI-written room descriptions.">
            {(p) => <Textarea {...p} rows={4} maxLength={4000} placeholder="What makes this place special?" {...text("description")} />}
          </Field>
          <Field label="Neighborhood" optional>
            {(p) => <Input {...p} maxLength={120} placeholder="Logan Square" {...text("neighborhood")} />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-2">Amenities</p>
            <TagInput
              value={draft.amenities}
              suggestions={AMENITY_SUGGESTIONS}
              placeholder="Type and press Enter"
              onChange={(amenities) => {
                setDraft((d) => ({ ...d, amenities }));
                void updateProperty({ amenities });
              }}
            />
          </div>
          <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <p className="font-semibold text-ink">Contact</p>
            <p className="mb-4 mt-0.5 text-sm text-ink-3">Shown on the tour so buyers and guests can reach you.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">{(p) => <Input {...p} autoComplete="name" {...text("contactName")} />}</Field>
              <Field label="Company">{(p) => <Input {...p} autoComplete="organization" {...text("contactCompany")} />}</Field>
              <Field label="Email">{(p) => <Input {...p} type="email" autoComplete="email" {...text("contactEmail")} />}</Field>
              <Field label="Phone">{(p) => <Input {...p} type="tel" autoComplete="tel" {...text("contactPhone")} />}</Field>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex justify-end">
        <Link href={`/app/p/${property.id}/floor-plan`} className={buttonClasses("primary", "md")}>
          Continue to floor plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
