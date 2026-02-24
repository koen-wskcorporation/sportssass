"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { submitFormResponseAction } from "@/modules/forms/actions";
import { REGISTRATION_PAGE_KEYS } from "@/modules/forms/types";
import { createPlayerAction } from "@/modules/players/actions";
import type { FormField as FormFieldDefinition, FormPage, OrgForm } from "@/modules/forms/types";
import type { PlayerPickerItem } from "@/modules/players/types";
import type { ProgramNode } from "@/modules/programs/types";

type RegistrationFormClientProps = {
  orgSlug: string;
  formSlug: string;
  form: OrgForm;
  players: PlayerPickerItem[];
  programNodes: ProgramNode[];
};

type RuleState = {
  hiddenFieldNames: Set<string>;
  requiredFieldNames: Set<string>;
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

function isValueMissing(field: FormFieldDefinition, value: unknown) {
  if (field.type === "checkbox") {
    return value !== true;
  }

  return value === undefined || value === null || value === "";
}

function computeRuleState(fields: FormFieldDefinition[], rules: OrgForm["schemaJson"]["rules"], answers: Record<string, unknown>): RuleState {
  const visibleFieldNameSet = new Set(fields.map((field) => field.name));
  const requiredFieldNames = new Set(fields.filter((field) => field.required).map((field) => field.name));
  const hiddenFieldNames = new Set<string>();

  for (const rule of rules) {
    if (!visibleFieldNameSet.has(rule.sourceFieldName) || !visibleFieldNameSet.has(rule.targetFieldName)) {
      continue;
    }

    const sourceValue = answers[rule.sourceFieldName];
    const ruleMatched = evaluateRule(sourceValue, rule.operator, rule.value);

    if (rule.effect === "show" && !ruleMatched) {
      hiddenFieldNames.add(rule.targetFieldName);
      continue;
    }

    if (rule.effect === "require" && ruleMatched) {
      requiredFieldNames.add(rule.targetFieldName);
    }
  }

  return {
    hiddenFieldNames,
    requiredFieldNames
  };
}

function nodeMatchesFieldTarget(field: FormFieldDefinition, selectedNodeId: string | null, nodeById: Map<string, ProgramNode>) {
  if (field.targetNodeIds.length === 0) {
    return true;
  }

  if (!selectedNodeId) {
    return false;
  }

  if (field.targetNodeIds.includes(selectedNodeId)) {
    return true;
  }

  if (!field.includeDescendants) {
    return false;
  }

  let cursor = nodeById.get(selectedNodeId);

  while (cursor?.parentId) {
    if (field.targetNodeIds.includes(cursor.parentId)) {
      return true;
    }

    cursor = nodeById.get(cursor.parentId);
  }

  return false;
}

function getFieldTargetDescription(field: FormFieldDefinition, programNodes: ProgramNode[]) {
  if (field.targetNodeIds.length === 0) {
    return "Program-wide";
  }

  const labels = field.targetNodeIds
    .map((targetId) => programNodes.find((node) => node.id === targetId)?.name)
    .filter((name): name is string => Boolean(name));

  if (labels.length === 0) {
    return "Specific structure nodes";
  }

  return field.includeDescendants ? `${labels.join(", ")} (+ child nodes)` : labels.join(", ");
}

function getPageTitle(page: FormPage | undefined, fallback: string) {
  if (!page) {
    return fallback;
  }

  return page.title || fallback;
}

export function RegistrationFormClient({ orgSlug, formSlug, form, players, programNodes }: RegistrationFormClientProps) {
  const { toast } = useToast();

  const allowMultiplePlayers = Boolean(form.settingsJson.allowMultiplePlayers);
  const requiresPlayers = form.formKind === "program_registration";
  const schemaPages = form.schemaJson.pages;
  const nodeById = useMemo(() => new Map(programNodes.map((node) => [node.id, node])), [programNodes]);

  const [isSubmitting, startSubmitting] = useTransition();
  const [isCreatingPlayer, startCreatingPlayer] = useTransition();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [genericAnswers, setGenericAnswers] = useState<Record<string, unknown>>({});
  const [answersByPlayerId, setAnswersByPlayerId] = useState<Record<string, Record<string, unknown>>>({});
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

  const currentPage = schemaPages[currentPageIndex];
  const isLastPage = currentPageIndex === schemaPages.length - 1;

  const registrationPlayerPage = schemaPages.find((page) => page.pageKey === REGISTRATION_PAGE_KEYS.player);
  const registrationDivisionPage = schemaPages.find((page) => page.pageKey === REGISTRATION_PAGE_KEYS.divisionQuestions);
  const registrationPaymentPage = schemaPages.find((page) => page.pageKey === REGISTRATION_PAGE_KEYS.payment);

  function getEffectiveNodeIdForPlayer(playerId: string): string | null {
    if (form.targetMode === "locked") {
      return form.lockedProgramNodeId;
    }

    return selectedNodeByPlayerId[playerId] ?? null;
  }

  function updateGenericAnswer(fieldName: string, value: unknown) {
    setGenericAnswers((current) => ({
      ...current,
      [fieldName]: value
    }));
  }

  function updatePlayerAnswer(playerId: string, fieldName: string, value: unknown) {
    setAnswersByPlayerId((current) => ({
      ...current,
      [playerId]: {
        ...(current[playerId] ?? {}),
        [fieldName]: value
      }
    }));
  }

  function togglePlayer(playerId: string) {
    if (allowMultiplePlayers) {
      setSelectedPlayerIds((current) => (current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]));
      return;
    }

    setSelectedPlayerIds((current) => (current[0] === playerId ? [] : [playerId]));
  }

  function getPlayerFieldsForNode(playerId: string) {
    const allFields = registrationDivisionPage?.fields ?? [];
    const selectedNodeId = getEffectiveNodeIdForPlayer(playerId);

    return allFields.filter((field) => nodeMatchesFieldTarget(field, selectedNodeId, nodeById));
  }

  function validateGenericPage(page: FormPage) {
    const ruleState = computeRuleState(page.fields, form.schemaJson.rules, genericAnswers);

    for (const field of page.fields) {
      if (ruleState.hiddenFieldNames.has(field.name)) {
        continue;
      }

      if (!ruleState.requiredFieldNames.has(field.name)) {
        continue;
      }

      const value = genericAnswers[field.name];
      if (isValueMissing(field, value)) {
        return `${field.label} is required.`;
      }
    }

    return null;
  }

  function validateRegistrationPlayerPage() {
    if (selectedPlayerIds.length === 0) {
      return "Select at least one player to continue.";
    }

    return null;
  }

  function validateRegistrationDivisionPage() {
    if (selectedPlayerIds.length === 0) {
      return "Select at least one player before answering questions.";
    }

    if (form.targetMode === "choice") {
      for (const playerId of selectedPlayerIds) {
        if (!selectedNodeByPlayerId[playerId]) {
          return "Choose a division for each selected player.";
        }
      }
    }

    for (const playerId of selectedPlayerIds) {
      const player = localPlayers.find((item) => item.id === playerId);
      const playerLabel = player?.label ?? "Selected player";
      const fields = getPlayerFieldsForNode(playerId);
      const playerAnswers = answersByPlayerId[playerId] ?? {};
      const ruleState = computeRuleState(fields, form.schemaJson.rules, playerAnswers);

      for (const field of fields) {
        if (ruleState.hiddenFieldNames.has(field.name)) {
          continue;
        }

        if (!ruleState.requiredFieldNames.has(field.name)) {
          continue;
        }

        const value = playerAnswers[field.name];
        if (isValueMissing(field, value)) {
          return `${playerLabel}: ${field.label} is required.`;
        }
      }
    }

    return null;
  }

  function validateCurrentPage() {
    if (!currentPage) {
      return "Form page not found.";
    }

    if (!requiresPlayers) {
      return validateGenericPage(currentPage);
    }

    if (currentPage.pageKey === REGISTRATION_PAGE_KEYS.player) {
      return validateRegistrationPlayerPage();
    }

    if (currentPage.pageKey === REGISTRATION_PAGE_KEYS.divisionQuestions) {
      return validateRegistrationDivisionPage();
    }

    return null;
  }

  function validateBeforeSubmit() {
    if (!requiresPlayers) {
      for (const page of schemaPages) {
        const error = validateGenericPage(page);
        if (error) {
          return error;
        }
      }

      return null;
    }

    const playerError = validateRegistrationPlayerPage();
    if (playerError) {
      return playerError;
    }

    const divisionError = validateRegistrationDivisionPage();
    if (divisionError) {
      return divisionError;
    }

    return null;
  }

  function moveToNextPage() {
    const validationError = validateCurrentPage();

    if (validationError) {
      toast({
        title: "Incomplete page",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setCurrentPageIndex((index) => Math.min(index + 1, schemaPages.length - 1));
  }

  function moveToPreviousPage() {
    setCurrentPageIndex((index) => Math.max(index - 1, 0));
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

      setLocalPlayers((current) => [...current, newPlayer].sort((a, b) => a.label.localeCompare(b.label)));
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateBeforeSubmit();
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
        answers: requiresPlayers ? {} : genericAnswers,
        playerEntries: requiresPlayers
          ? selectedPlayerIds.map((playerId) => ({
              playerId,
              programNodeId: getEffectiveNodeIdForPlayer(playerId),
              answers: answersByPlayerId[playerId] ?? {}
            }))
          : [],
        metadata: {
          source: requiresPlayers ? "registration_form" : "generic_form"
        }
      });

      if (!result.ok) {
        toast({
          title: requiresPlayers ? "Unable to submit registration" : "Unable to submit form",
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
        title: requiresPlayers ? "Registration submitted" : "Form submitted",
        variant: "success"
      });
    });
  }

  function renderField(
    field: FormFieldDefinition,
    value: unknown,
    required: boolean,
    onChange: (fieldName: string, nextValue: unknown) => void,
    keyPrefix: string
  ) {
    const fieldLabel = required ? `${field.label} *` : field.label;

    if (field.type === "textarea") {
      return (
        <FormField key={`${keyPrefix}-${field.id}`} label={fieldLabel}>
          <Textarea
            className="min-h-[100px]"
            onChange={(event) => onChange(field.name, event.target.value)}
            placeholder={field.placeholder ?? undefined}
            value={asString(value)}
          />
        </FormField>
      );
    }

    if (field.type === "select") {
      return (
        <FormField key={`${keyPrefix}-${field.id}`} label={fieldLabel}>
          <Select
            onChange={(event) => onChange(field.name, event.target.value)}
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
        <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text" key={`${keyPrefix}-${field.id}`}>
          <input
            checked={value === true || value === "true" || value === "on"}
            onChange={(event) => onChange(field.name, event.target.checked)}
            type="checkbox"
          />
          {fieldLabel}
        </label>
      );
    }

    if (field.type === "date") {
      return (
        <FormField key={`${keyPrefix}-${field.id}`} label={fieldLabel}>
          <CalendarPicker onChange={(nextValue) => onChange(field.name, nextValue)} value={asString(value)} />
        </FormField>
      );
    }

    const inputType = field.type === "number" ? "number" : field.type === "email" ? "email" : "text";

    return (
      <FormField key={`${keyPrefix}-${field.id}`} label={fieldLabel}>
        <Input
          onChange={(event) => onChange(field.name, inputType === "number" ? Number(event.target.value) : event.target.value)}
          placeholder={field.placeholder ?? undefined}
          type={inputType}
          value={asString(value)}
        />
      </FormField>
    );
  }

  const genericCurrentRuleState = currentPage && !requiresPlayers ? computeRuleState(currentPage.fields, form.schemaJson.rules, genericAnswers) : null;

  return (
    <div className="space-y-4">
      {successState ? (
        <Alert variant="success">
          Submitted successfully. Submission ID: {successState.submissionId} ({successState.status})
        </Alert>
      ) : null}

      {schemaPages.length > 1 ? (
        <div className="rounded-control border bg-surface px-3 py-2 text-sm text-text-muted">
          Step {currentPageIndex + 1} of {schemaPages.length}: {currentPage?.title ?? "Form"}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!requiresPlayers && currentPage ? (
          <div className="space-y-3 rounded-card border bg-surface p-4">
            <div>
              <h3 className="font-semibold text-text">{currentPage.title}</h3>
              {currentPage.description ? <p className="text-sm text-text-muted">{currentPage.description}</p> : null}
            </div>
            {currentPage.fields
              .filter((field) => !genericCurrentRuleState?.hiddenFieldNames.has(field.name))
              .map((field) =>
                renderField(
                  field,
                  genericAnswers[field.name],
                  Boolean(genericCurrentRuleState?.requiredFieldNames.has(field.name)),
                  updateGenericAnswer,
                  currentPage.id
                )
              )}
          </div>
        ) : null}

        {requiresPlayers && currentPage?.pageKey === REGISTRATION_PAGE_KEYS.player ? (
          <div className="space-y-3 rounded-card border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-text">{getPageTitle(registrationPlayerPage, "Player")}</h3>
                {registrationPlayerPage?.description ? <p className="text-sm text-text-muted">{registrationPlayerPage.description}</p> : null}
              </div>
              <Button onClick={() => setPlayerModalOpen(true)} size="sm" type="button" variant="secondary">
                Add player
              </Button>
            </div>

            {localPlayers.length === 0 ? <Alert variant="warning">No players yet. Add a player to continue.</Alert> : null}

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
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {requiresPlayers && currentPage?.pageKey === REGISTRATION_PAGE_KEYS.divisionQuestions ? (
          <div className="space-y-3 rounded-card border bg-surface p-4">
            <div>
              <h3 className="font-semibold text-text">{getPageTitle(registrationDivisionPage, "Division + Questions")}</h3>
              {registrationDivisionPage?.description ? <p className="text-sm text-text-muted">{registrationDivisionPage.description}</p> : null}
            </div>

            {selectedPlayerIds.length === 0 ? <Alert variant="info">Select at least one player on the previous step to continue.</Alert> : null}

            {selectedPlayerIds.map((playerId) => {
              const player = localPlayers.find((item) => item.id === playerId);
              const playerAnswers = answersByPlayerId[playerId] ?? {};
              const targetedFields = getPlayerFieldsForNode(playerId);
              const ruleState = computeRuleState(targetedFields, form.schemaJson.rules, playerAnswers);
              const selectedNodeId = getEffectiveNodeIdForPlayer(playerId);
              const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : null;

              return (
                <div className="space-y-3 rounded-control border bg-surface-muted p-3" key={playerId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text">{player?.label ?? "Selected player"}</p>
                    {selectedNode ? <p className="text-xs text-text-muted">Node: {selectedNode.name}</p> : null}
                  </div>

                  {form.targetMode === "choice" ? (
                    <FormField label="Node">
                      <Select
                        onChange={(event) =>
                          setSelectedNodeByPlayerId((current) => ({
                            ...current,
                            [playerId]: event.target.value
                          }))
                        }
                        options={[
                          { value: "", label: "Select node" },
                          ...programNodes.map((node) => ({ value: node.id, label: `${node.name} (${node.nodeKind})` }))
                        ]}
                        value={selectedNodeByPlayerId[playerId] ?? ""}
                      />
                    </FormField>
                  ) : null}

                  {form.targetMode === "locked" ? (
                    <p className="text-xs text-text-muted">
                      Locked to: {selectedNode ? `${selectedNode.name} (${selectedNode.nodeKind})` : "No locked node configured."}
                    </p>
                  ) : null}

                  {targetedFields
                    .filter((field) => !ruleState.hiddenFieldNames.has(field.name))
                    .map((field) => (
                      <div className="space-y-1" key={`${playerId}-${field.id}`}>
                        {renderField(
                          field,
                          playerAnswers[field.name],
                          ruleState.requiredFieldNames.has(field.name),
                          (fieldName, nextValue) => updatePlayerAnswer(playerId, fieldName, nextValue),
                          playerId
                        )}
                        <p className="text-[11px] text-text-muted">Applies to: {getFieldTargetDescription(field, programNodes)}</p>
                      </div>
                    ))}

                  {targetedFields.filter((field) => !ruleState.hiddenFieldNames.has(field.name)).length === 0 ? (
                    <Alert variant="info">No questions apply to this player/node combination.</Alert>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {requiresPlayers && currentPage?.pageKey === REGISTRATION_PAGE_KEYS.payment ? (
          <div className="space-y-3 rounded-card border bg-surface p-4">
            <div>
              <h3 className="font-semibold text-text">{getPageTitle(registrationPaymentPage, "Payment")}</h3>
              {registrationPaymentPage?.description ? <p className="text-sm text-text-muted">{registrationPaymentPage.description}</p> : null}
            </div>
            <Alert variant="info">Payment is a placeholder for now. Review your registration details and submit.</Alert>
            <div className="space-y-2">
              {selectedPlayerIds.map((playerId) => {
                const player = localPlayers.find((item) => item.id === playerId);
                const selectedNodeId = getEffectiveNodeIdForPlayer(playerId);
                const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : null;

                return (
                  <div className="rounded-control border bg-surface-muted px-3 py-2 text-sm text-text" key={`summary-${playerId}`}>
                    <p className="font-medium">{player?.label ?? "Selected player"}</p>
                    <p className="text-xs text-text-muted">Node: {selectedNode ? `${selectedNode.name} (${selectedNode.nodeKind})` : "Not selected"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={currentPageIndex === 0} onClick={moveToPreviousPage} type="button" variant="secondary">
            Back
          </Button>

          {!isLastPage ? (
            <Button onClick={moveToNextPage} type="button">
              Next
            </Button>
          ) : (
            <Button disabled={isSubmitting} loading={isSubmitting} type="submit">
              {isSubmitting ? "Submitting..." : requiresPlayers ? "Submit registration" : "Submit"}
            </Button>
          )}
        </div>
      </form>

      <Panel
        footer={
          <>
            <Button onClick={() => setPlayerModalOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isCreatingPlayer} form="registration-create-player-form" loading={isCreatingPlayer} type="submit">
              {isCreatingPlayer ? "Saving..." : "Add player"}
            </Button>
          </>
        }
        onClose={() => setPlayerModalOpen(false)}
        open={playerModalOpen}
        subtitle="Create a player profile and continue registration."
        title="Add player"
      >
        <form className="space-y-3" id="registration-create-player-form" onSubmit={handleCreatePlayer}>
          <FormField label="First name">
            <Input onChange={(event) => setNewPlayerFirstName(event.target.value)} required value={newPlayerFirstName} />
          </FormField>
          <FormField label="Last name">
            <Input onChange={(event) => setNewPlayerLastName(event.target.value)} required value={newPlayerLastName} />
          </FormField>
          <FormField label="Date of birth">
            <CalendarPicker onChange={setNewPlayerDob} value={newPlayerDob} />
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
        </form>
      </Panel>
    </div>
  );
}
