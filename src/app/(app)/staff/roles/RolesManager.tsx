"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RoleDef, AccessMap, Section } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function RoleRow({
  role,
  sections,
  allSections,
  sectionLabels,
  currentStaff,
}: {
  role: RoleDef;
  sections: Section[];
  allSections: Section[];
  sectionLabels: Record<Section, string>;
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<Section>>(new Set(sections));
  const [canDelete, setCanDelete] = useState(role.can_delete);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(section: Section) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();

    const { error: roleError } = await supabase.from("custom_roles").update({ can_delete: canDelete }).eq("key", role.key);
    if (roleError) {
      setSaving(false);
      setError(roleError.message);
      return;
    }

    const { error: delError } = await supabase.from("role_section_access").delete().eq("role_key", role.key);
    if (delError) {
      setSaving(false);
      setError(delError.message);
      return;
    }

    const rows = Array.from(selected).map((section) => ({ role_key: role.key, section }));
    if (rows.length) {
      const { error: insError } = await supabase.from("role_section_access").insert(rows);
      if (insError) {
        setSaving(false);
        setError(insError.message);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    await logAudit(supabase, currentStaff, "update", "custom_roles", role.key, `Updated access for ${role.label}`);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: delError } = await supabase.from("custom_roles").delete().eq("key", role.key);
    setDeleting(false);
    if (delError) {
      setError(
        delError.message.includes("foreign key")
          ? "Can't delete -- staff members are still assigned this role. Reassign them first."
          : delError.message
      );
      return;
    }
    await logAudit(supabase, currentStaff, "delete", "custom_roles", role.key, `Deleted role ${role.label}`);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium text-ink text-sm">{role.label}</p>
          <p className="text-[11px] text-ink/40">
            {role.key}
            {role.is_system && <span className="ml-2 text-gold">system</span>}
          </p>
        </div>
        {!role.is_system &&
          (confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink/60">Delete this role?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red font-medium hover:underline disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-ink/50 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs text-ink/40 hover:text-red hover:underline"
            >
              Delete
            </button>
          ))}
      </div>

      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mb-3">{error}</div>}

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
        {allSections.map((section) => (
          <label key={section} className="flex items-center gap-1.5 text-xs text-ink/80 cursor-pointer">
            <input type="checkbox" checked={selected.has(section)} onChange={() => toggle(section)} />
            {sectionLabels[section]}
          </label>
        ))}
      </div>

      <label className="flex items-center gap-1.5 text-xs text-ink/80 cursor-pointer mb-3 pt-3 border-t border-line">
        <input type="checkbox" checked={canDelete} onChange={() => setCanDelete((v) => !v)} />
        Can delete clients &amp; properties
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-xs text-green">Saved.</span>}
      </div>
    </div>
  );
}

function NewRoleForm({
  allSections,
  sectionLabels,
  existingKeys,
  currentStaff,
}: {
  allSections: Section[];
  sectionLabels: Record<Section, string>;
  existingKeys: string[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [selected, setSelected] = useState<Set<Section>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(section: Section) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalKey = keyTouched ? key.trim() : slugify(label);
    if (!label.trim() || !finalKey) {
      setError("Label and role key are required.");
      return;
    }
    if (existingKeys.includes(finalKey)) {
      setError(`Role key "${finalKey}" already exists.`);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insError } = await supabase.from("custom_roles").insert({
      key: finalKey,
      label: label.trim(),
      is_system: false,
    });
    if (insError) {
      setSaving(false);
      setError(insError.message);
      return;
    }

    if (selected.size) {
      const rows = Array.from(selected).map((section) => ({ role_key: finalKey, section }));
      const { error: accessError } = await supabase.from("role_section_access").insert(rows);
      if (accessError) {
        setSaving(false);
        setError(accessError.message);
        return;
      }
    }

    await logAudit(supabase, currentStaff, "create", "custom_roles", finalKey, `Created role ${label.trim()}`);

    setSaving(false);
    setLabel("");
    setKey("");
    setKeyTouched(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Role Name</label>
        <input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (!keyTouched) setKey(slugify(e.target.value));
          }}
          placeholder="e.g. Cleaner"
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Role Key</label>
        <input
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setKeyTouched(true);
          }}
          placeholder="cleaner"
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm font-mono"
        />
        <p className="text-[10px] text-ink/40 mt-1">Lowercase, no spaces. Used internally and can't be changed later.</p>
      </div>

      <div>
        <p className="text-xs text-ink/60 mb-1.5">Section Access</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {allSections.map((section) => (
            <label key={section} className="flex items-center gap-1.5 text-xs text-ink/80 cursor-pointer">
              <input type="checkbox" checked={selected.has(section)} onChange={() => toggle(section)} />
              {sectionLabels[section]}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
      >
        {saving ? "Creating..." : "Create Role"}
      </button>
    </form>
  );
}

export function RolesManager({
  initialRoles,
  initialAccessMap,
  allSections,
  sectionLabels,
  currentStaff,
}: {
  initialRoles: RoleDef[];
  initialAccessMap: AccessMap;
  allSections: Section[];
  sectionLabels: Record<Section, string>;
  currentStaff?: { id: string; name: string };
}) {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-4">
        {initialRoles.map((role) => (
          <RoleRow
            key={role.key}
            role={role}
            sections={initialAccessMap[role.key] ?? []}
            allSections={allSections}
            sectionLabels={sectionLabels}
            currentStaff={currentStaff}
          />
        ))}
      </div>
      <div>
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">New Role</p>
        <NewRoleForm
          allSections={allSections}
          sectionLabels={sectionLabels}
          existingKeys={initialRoles.map((r) => r.key)}
          currentStaff={currentStaff}
        />
      </div>
    </div>
  );
}
