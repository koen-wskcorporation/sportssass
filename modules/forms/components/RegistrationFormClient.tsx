"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { submitFormResponseAction } from "@/modules/forms/actions";
import { createPlayerAction } from "@/modules/players/actions";
import type { OrgForm } from "@/modules/forms/types";
import type { PlayerPickerItem } from "@/modules/players/types";
import type { ProgramNode } from "@/modules/programs/types";

type RegistrationFormClientProps = {
  orgSlug: string;
  formSlug: string;
  form: OrgForm;
  players: PlayerPickerItem[];
  programNodes: ProgramNode[];
};

function asString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function evaluateRule(sourceValue: unknown, operator: string, expectedValue: unknown) {
  if (operator === "is_true") {
    return sourceValue === true || sourceValue === "true" || sourceValue === "on";
  }

  if (operator === "is_false") {
    return !sourceValue || sourceValue === "false" || sourceValue === "off";
  }

  if (operator === "equals") {
    return String(sourceValue ?? "") === String(expectedValue ?? "");
  }

  if (operator === "not_equals") {
    return String(sourceValue ?? "") !== String(expectedValue ?? "");
  }

  return false;
}

export function RegistrationFormClient({ orgSlug, formSlug, form, players, programNodes }: RegistrationFormClientProps) {
  const { toast } = useToast();

  const allowMultiplePlayers = Boolean(form.settingsJson.allowMultiplePlayers);
  const requiresPlayers = form.formKind === "program_registration";

  const [isSubmitting, startSubmitting] = useTransition();
  const [isCreatingPlayer, startCreatingPlayer] = useTransition();

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedNodeByPlayerId, setSelectedNodeByPlayerId] = useState<Record<string, string>>({});
  const [successState, setSuccessState] = useState<{ submissionId: string; status: string } | null>(null);

  const [localPlayers, setLocalPlayers] = useState<PlayerPickerItem[]>(players);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [newPlayerFirstName, setNewPlayerFirstName] = useState("");
  const [newPlayerLastName, setNewPlayerLastName] = useState("");
  const [newPlayerDob, setNewPlayerDob] = useState("");
  const [newPlayerGender, setNewPlayerGender] = useState("");
  const [newPlayerGenderMode, setNewPlayerGenderMode] = useState("");

  const fields = useMemo(() => {
    return form.schemaJson.sections.flatMap((section) =>
      section.fields.map((field) => ({
        ...field,
        sectionTitle: section.title
      }))
    );
  }, [form.schemaJson.sections]);

  const requiredFieldNames = useMemo(() => {
    const required = new Set(form.schemaJson.sections.flatMap((section) => section.fields.filter((field) => field.required).map((field) => field.name)));

    for (const rule of form.schemaJson.rules) {
      if (rule.effect !== "require") {
        continue;
      }

      const sourceValue = answers[rule.sourceFieldName];
      if (evaluateRule(sourceValue, rule.operator, rule.value)) {
        required.add(rule.targetFieldName);
      }
    }

    return required;
  }, [answers, form.schemaJson.rules, form.schemaJson.sections]);

  const hiddenFieldNames = useMemo(() => {
    const hidden = new Set<string>();

    for (const rule of form.schemaJson.rules) {
      if (rule.effect !== "show") {
        continue;
      }

      const sourceValue = answers[rule.sourceFieldName];
      if (!evaluateRule(sourceValue, rule.operator, rule.value)) {
        hidden.add(rule.targetFieldName);
      }
    }

    return hidden;
  }, [answers, form.schemaJson.rules]);

  const visibleFields = useMemo(() => {
    return fields.filter((field) => !hiddenFieldNames.has(field.name));
  }, [fields, hiddenFieldNames]);

  function updateAnswer(fieldName: string, value: unknown) {
    setAnswers((current) => ({
      ...current,
      [fieldName]: value
    }));
  }

  function togglePlayer(playerId: string) {
    if (allowMultiplePlayers) {
      setSelectedPlayerIds((current) =>
        current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
      );
      return;
    }

    setSelectedPlayerIds((current) => (current[0] === playerId ? [] : [playerId]));
  }

  function handleCreatePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startCreatingPlayer(async () => {
      const result = await createPlayerAction({
        firstName: newPlayerFirstName,
        lastName: newPlayerLastName,
        dateOfBirth: newPlayerDob,
        gender: newPlayerGender
      });

      if (!result.ok) {
        toast({
          title: "Unable to create player",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      const newPlayer = {
        id: result.data.player.id,
        label: `${result.data.player.firstName} ${result.data.player.lastName}`,
        subtitle: result.data.player.dateOfBirth ? `DOB: ${result.data.player.dateOfBirth}` : null
      } satisfies PlayerPickerItem;

      setLocalPlayers((current) => {
        const next = [...current, newPlayer].sort((a, b) => a.label.localeCompare(b.label));
        return next;
      });

      setSelectedPlayerIds((current) => (allowMultiplePlayers ? [...current, newPlayer.id] : [newPlayer.id]));

      setPlayerModalOpen(false);
      setNewPlayerFirstName("");
      setNewPlayerLastName("");
      setNewPlayerDob("");
      setNewPlayerGender("");
      setNewPlayerGenderMode("");

      toast({
        title: "Player added",
        variant: "success"
      });
    });
  }

  function validateForm() {
    for (const field of visibleFields) {
      if (!requiredFieldNames.has(field.name)) {
        continue;
      }

      const value = answers[field.name];
      if (value === undefined || value === null || value === "") {
        return `${field.label} is required.`;
      }

      if (field.type === "checkbox" && value !== true) {
        return `${field.label} is required.`;
      }
    }

    if (requiresPlayers && selectedPlayerIds.length === 0) {
      return "Select at least one player to continue.";
    }

    if (requiresPlayers && form.targetMode === "choice") {
      for (const playerId of selectedPlayerIds) {
        if (!selectedNodeByPlayerId[playerId]) {
          return "Choose a division/subdivision for each selected player.";
        }
      }
    }

    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Incomplete form",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    startSubmitting(async () => {
      const result = await submitFormResponseAction({
        orgSlug,
        formSlug,
        answers,
        playerEntries: selectedPlayerIds.map((playerId) => ({
          playerId,
          programNodeId: form.targetMode === "locked" ? form.lockedProgramNodeId : selectedNodeByPlayerId[playerId] ?? null,
          answers: {}
        })),
        metadata: {
          source: "registration_form"
        }
      });

      if (!result.ok) {
        toast({
          title: "Unable to submit registration",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setSuccessState({
        submissionId: result.data.submissionId,
        status: result.data.status
      });
      toast({
        title: "Registration submitted",
        variant: "success"
      });
    });
  }

  return (
    <div className="space-y-4">
      {successState ? (
        <Alert variant="success">
          Submitted successfully. Submission ID: {successState.submissionId} ({successState.status})
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {form.schemaJson.sections.map((section) => (
          <div className="space-y-3 rounded-card border bg-surface p-4" key={section.id}>
            <div>
              <h3 className="font-semibold text-text">{section.title}</h3>
              {section.description ? <p className="text-sm text-text-muted">{section.description}</p> : null}
            </div>
            {section.fields
              .filter((field) => !hiddenFieldNames.has(field.name))
              .map((field) => {
                const required = requiredFieldNames.has(field.name);
                const value = answers[field.name];

                if (field.type === "textarea") {
                  return (
                    <FormField key={field.id} label={required ? `${field.label} *` : field.label}>
                      <Textarea
                        className="min-h-[100px]"
                        onChange={(event) => updateAnswer(field.name, event.target.value)}
                        placeholder={field.placeholder ?? undefined}
                        value={asString(value)}
                      />
                    </FormField>
                  );
                }

                if (field.type === "select") {
                  return (
                    <FormField key={field.id} label={required ? `${field.label} *` : field.label}>
                      <Select
                        onChange={(event) => updateAnswer(field.name, event.target.value)}
                        options={[
                          { value: "", label: "Select" },
                          ...field.options.map((option) => ({ value: option.value, label: option.label }))
                        ]}
                        value={asString(value)}
                      />
                    </FormField>
                  );
                }

                if (field.type === "checkbox") {
                  return (
                    <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text" key={field.id}>
                      <input
                        checked={value === true || value === "true" || value === "on"}
                        onChange={(event) => updateAnswer(field.name, event.target.checked)}
                        type="checkbox"
                      />
                      {required ? `${field.label} *` : field.label}
                    </label>
                  );
                }

                const inputType =
                  field.type === "number"
                    ? "number"
                    : field.type === "date"
                      ? "date"
                      : field.type === "email"
                        ? "email"
                        : "text";

                return (
                  <FormField key={field.id} label={required ? `${field.label} *` : field.label}>
                    <Input
                      onChange={(event) => updateAnswer(field.name, inputType === "number" ? Number(event.target.value) : event.target.value)}
                      placeholder={field.placeholder ?? undefined}
                      type={inputType}
                      value={asString(value)}
                    />
                  </FormField>
                );
              })}
          </div>
        ))}

        {requiresPlayers ? (
          <div className="space-y-3 rounded-card border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-text">Players</h3>
              <Button onClick={() => setPlayerModalOpen(true)} size="sm" type="button" variant="secondary">
                Add player
              </Button>
            </div>

            {localPlayers.length === 0 ? <Alert variant="warning">No players yet. Add a player to register.</Alert> : null}

            <div className="space-y-2">
              {localPlayers.map((player) => {
                const checked = selectedPlayerIds.includes(player.id);

                return (
                  <div className="rounded-control border bg-surface-muted px-3 py-2" key={player.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-text">
                      <span>
                        <span className="font-medium">{player.label}</span>
                        {player.subtitle ? <span className="ml-2 text-text-muted">{player.subtitle}</span> : null}
                      </span>
                      <input checked={checked} onChange={() => togglePlayer(player.id)} type={allowMultiplePlayers ? "checkbox" : "radio"} />
                    </label>

                    {checked && requiresPlayers && form.targetMode === "choice" ? (
                      <div className="mt-2">
                        <Select
                          onChange={(event) =>
                            setSelectedNodeByPlayerId((current) => ({
                              ...current,
                              [player.id]: event.target.value
                            }))
                          }
                          options={[
                            { value: "", label: "Select division/subdivision" },
                            ...programNodes.map((node) => ({
                              value: node.id,
                              label: `${node.name} (${node.nodeKind})`
                            }))
                          ]}
                          value={selectedNodeByPlayerId[player.id] ?? ""}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {form.targetMode === "locked" && form.lockedProgramNodeId ? (
              <p className="text-xs text-text-muted">This registration is locked to one target division/subdivision.</p>
            ) : null}
          </div>
        ) : null}

        <Button disabled={isSubmitting} loading={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit registration"}
        </Button>
      </form>

      <Dialog onClose={() => setPlayerModalOpen(false)} open={playerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add player</DialogTitle>
            <DialogDescription>Create a player profile and continue registration.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreatePlayer}>
            <FormField label="First name">
              <Input onChange={(event) => setNewPlayerFirstName(event.target.value)} required value={newPlayerFirstName} />
            </FormField>
            <FormField label="Last name">
              <Input onChange={(event) => setNewPlayerLastName(event.target.value)} required value={newPlayerLastName} />
            </FormField>
            <FormField label="Date of birth">
              <Input onChange={(event) => setNewPlayerDob(event.target.value)} type="date" value={newPlayerDob} />
            </FormField>
            <FormField label="Gender">
              <Select
                onChange={(event) => {
                  const mode = event.target.value;
                  setNewPlayerGenderMode(mode);
                  if (mode === "other" || mode === "") {
                    if (mode === "") {
                      setNewPlayerGender("");
                    }
                    return;
                  }
                  setNewPlayerGender(mode);
                }}
                options={[
                  { value: "", label: "Select gender" },
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "non-binary", label: "Non-binary" },
                  { value: "other", label: "Other" }
                ]}
                value={newPlayerGenderMode}
              />
            </FormField>
            {newPlayerGenderMode === "other" ? (
              <FormField label="Gender (other)">
                <Input onChange={(event) => setNewPlayerGender(event.target.value)} value={newPlayerGender} />
              </FormField>
            ) : null}

            <DialogFooter>
              <Button onClick={() => setPlayerModalOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isCreatingPlayer} loading={isCreatingPlayer} type="submit">
                {isCreatingPlayer ? "Saving..." : "Add player"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
