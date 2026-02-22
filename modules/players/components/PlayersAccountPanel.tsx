"use client";

import { Pencil, Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createPlayerAction, linkGuardianByEmailAction, updatePlayerAction } from "@/modules/players/actions";
import type { PlayerGuardian, PlayerProfile } from "@/modules/players/types";

type PlayerWithGuardians = {
  player: PlayerProfile;
  guardians: PlayerGuardian[];
};

type PlayersAccountPanelProps = {
  currentUserId: string;
  initialPlayers: PlayerWithGuardians[];
};

type PlayerDraft = {
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  jerseySize: string;
  medicalNotes: string;
};

const GENDER_PRESET_OPTIONS = [
  { value: "", label: "Select gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" }
] as const;

function isPresetGender(value: string) {
  return value === "male" || value === "female" || value === "non-binary";
}

function createDraft(player?: PlayerProfile): PlayerDraft {
  return {
    firstName: player?.firstName ?? "",
    lastName: player?.lastName ?? "",
    preferredName: player?.preferredName ?? "",
    dateOfBirth: player?.dateOfBirth ?? "",
    gender: player?.gender ?? "",
    jerseySize: player?.jerseySize ?? "",
    medicalNotes: player?.medicalNotes ?? ""
  };
}

function sortPlayers(players: PlayerWithGuardians[]) {
  return [...players].sort((a, b) => {
    const aName = `${a.player.lastName} ${a.player.firstName}`.toLowerCase();
    const bName = `${b.player.lastName} ${b.player.firstName}`.toLowerCase();
    return aName.localeCompare(bName);
  });
}

export function PlayersAccountPanel({ currentUserId, initialPlayers }: PlayersAccountPanelProps) {
  const { toast } = useToast();

  const [players, setPlayers] = useState<PlayerWithGuardians[]>(() => sortPlayers(initialPlayers));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const [createDraftState, setCreateDraftState] = useState<PlayerDraft>(() => createDraft());
  const [editDraftState, setEditDraftState] = useState<PlayerDraft>(() => createDraft());
  const [createGenderMode, setCreateGenderMode] = useState<string>("");
  const [editGenderMode, setEditGenderMode] = useState<string>("");

  const [isCreating, startCreating] = useTransition();
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isLinkingByPlayerId, setIsLinkingByPlayerId] = useState<Record<string, boolean>>({});
  const [guardianEmailByPlayerId, setGuardianEmailByPlayerId] = useState<Record<string, string>>({});
  const [guardianRelationshipByPlayerId, setGuardianRelationshipByPlayerId] = useState<Record<string, string>>({});

  const sortedPlayers = useMemo(() => sortPlayers(players), [players]);

  const editingPlayer = useMemo(() => {
    if (!editingPlayerId) {
      return null;
    }
    return sortedPlayers.find((item) => item.player.id === editingPlayerId)?.player ?? null;
  }, [editingPlayerId, sortedPlayers]);

  const editingPlayerWithGuardians = useMemo(() => {
    if (!editingPlayerId) {
      return null;
    }
    return sortedPlayers.find((item) => item.player.id === editingPlayerId) ?? null;
  }, [editingPlayerId, sortedPlayers]);

  function openEdit(player: PlayerProfile) {
    const nextMode = player.gender && !isPresetGender(player.gender) ? "other" : (player.gender ?? "");
    setEditingPlayerId(player.id);
    setEditDraftState(createDraft(player));
    setEditGenderMode(nextMode);
    setIsEditOpen(true);
  }

  function closeCreate() {
    if (isCreating) {
      return;
    }
    setIsCreateOpen(false);
    setCreateDraftState(createDraft());
    setCreateGenderMode("");
  }

  function closeEdit() {
    if (isSavingEdit) {
      return;
    }
    setIsEditOpen(false);
    setEditingPlayerId(null);
    setEditDraftState(createDraft());
    setEditGenderMode("");
  }

  function updatePlayerInState(updatedPlayer: PlayerProfile) {
    setPlayers((current) =>
      current.map((item) =>
        item.player.id === updatedPlayer.id
          ? {
              ...item,
              player: updatedPlayer
            }
          : item
      )
    );
  }

  function handleCreatePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startCreating(async () => {
      const result = await createPlayerAction(createDraftState);

      if (!result.ok) {
        toast({
          title: "Unable to create player",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setPlayers((current) =>
        sortPlayers([
          ...current,
          {
            player: result.data.player,
            guardians: []
          }
        ])
      );

      toast({
        title: "Player created",
        variant: "success"
      });
      closeCreate();
    });
  }

  function handleUpdatePlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingPlayerId) {
      return;
    }

    setIsSavingEdit(true);

    void (async () => {
      const result = await updatePlayerAction({
        playerId: editingPlayerId,
        ...editDraftState
      });

      setIsSavingEdit(false);

      if (!result.ok) {
        toast({
          title: "Unable to update player",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      updatePlayerInState(result.data.player);

      toast({
        title: "Player updated",
        variant: "success"
      });
      closeEdit();
    })();
  }

  function handleLinkGuardian(playerId: string) {
    const email = guardianEmailByPlayerId[playerId] ?? "";
    const relationship = guardianRelationshipByPlayerId[playerId] ?? "";

    setIsLinkingByPlayerId((current) => ({
      ...current,
      [playerId]: true
    }));

    void (async () => {
      const result = await linkGuardianByEmailAction({
        playerId,
        email,
        relationship
      });

      setIsLinkingByPlayerId((current) => ({
        ...current,
        [playerId]: false
      }));

      if (!result.ok) {
        toast({
          title: "Unable to link guardian",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setPlayers((current) =>
        current.map((item) => {
          if (item.player.id !== playerId) {
            return item;
          }

          return {
            ...item,
            guardians: [...item.guardians, result.data.guardian]
          };
        })
      );

      setGuardianEmailByPlayerId((current) => ({
        ...current,
        [playerId]: ""
      }));
      setGuardianRelationshipByPlayerId((current) => ({
        ...current,
        [playerId]: ""
      }));

      toast({
        title: "Guardian linked",
        variant: "success"
      });
    })();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Players</CardTitle>
              <CardDescription>Add and manage player profiles for registrations.</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} type="button">
              <Plus className="h-4 w-4" />
              Add player
            </Button>
          </div>
        </CardHeader>
      </Card>

      {sortedPlayers.length === 0 ? <Alert variant="info">No players yet. Add your first player.</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {sortedPlayers.map((item) => {
          const myGuardianLink = item.guardians.find((guardian) => guardian.guardianUserId === currentUserId);
          const relationshipToMe = myGuardianLink?.relationship ?? "Unspecified";

          return (
            <Card key={item.player.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>
                    {item.player.firstName} {item.player.lastName}
                  </CardTitle>
                  <Button onClick={() => openEdit(item.player)} type="button" variant="secondary">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">DOB:</span> {item.player.dateOfBirth ?? "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold">Relationship to you:</span> {relationshipToMe}
                  </p>
                  <p>
                    <span className="font-semibold">Gender:</span> {item.player.gender ?? "Not set"}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog onClose={closeCreate} open={isCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Add player</DialogTitle>
            <DialogDescription>Create a new player profile for registration.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreatePlayer}>
            <FormField label="First name">
              <Input
                onChange={(event) => setCreateDraftState((current) => ({ ...current, firstName: event.target.value }))}
                required
                value={createDraftState.firstName}
              />
            </FormField>
            <FormField label="Last name">
              <Input
                onChange={(event) => setCreateDraftState((current) => ({ ...current, lastName: event.target.value }))}
                required
                value={createDraftState.lastName}
              />
            </FormField>
            <FormField label="Date of birth">
              <Input onChange={(event) => setCreateDraftState((current) => ({ ...current, dateOfBirth: event.target.value }))} type="date" value={createDraftState.dateOfBirth} />
            </FormField>
            <FormField label="Gender">
              <Select
                onChange={(event) => {
                  const mode = event.target.value;
                  setCreateGenderMode(mode);

                  if (mode === "other" || mode === "") {
                    if (mode === "") {
                      setCreateDraftState((current) => ({ ...current, gender: "" }));
                    }
                    return;
                  }

                  setCreateDraftState((current) => ({ ...current, gender: mode }));
                }}
                options={GENDER_PRESET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={createGenderMode}
              />
            </FormField>
            {createGenderMode === "other" ? (
              <FormField label="Gender (other)">
                <Input onChange={(event) => setCreateDraftState((current) => ({ ...current, gender: event.target.value }))} value={createDraftState.gender} />
              </FormField>
            ) : null}
            <FormField label="Jersey size">
              <Input onChange={(event) => setCreateDraftState((current) => ({ ...current, jerseySize: event.target.value }))} value={createDraftState.jerseySize} />
            </FormField>
            <FormField className="md:col-span-2" label="Medical notes">
              <Textarea
                className="min-h-[90px]"
                onChange={(event) => setCreateDraftState((current) => ({ ...current, medicalNotes: event.target.value }))}
                value={createDraftState.medicalNotes}
              />
            </FormField>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button disabled={isCreating} loading={isCreating} type="submit">
                {isCreating ? "Saving..." : "Create player"}
              </Button>
              <Button disabled={isCreating} onClick={closeCreate} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onClose={closeEdit} open={isEditOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit player</DialogTitle>
            <DialogDescription>
              {editingPlayer ? `${editingPlayer.firstName} ${editingPlayer.lastName}` : "Update player details."}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleUpdatePlayer}>
            <FormField label="First name">
              <Input onChange={(event) => setEditDraftState((current) => ({ ...current, firstName: event.target.value }))} required value={editDraftState.firstName} />
            </FormField>
            <FormField label="Last name">
              <Input onChange={(event) => setEditDraftState((current) => ({ ...current, lastName: event.target.value }))} required value={editDraftState.lastName} />
            </FormField>
            <FormField label="Date of birth">
              <Input disabled value={editDraftState.dateOfBirth || "Not set"} />
            </FormField>
            <FormField label="Gender">
              <Select
                onChange={(event) => {
                  const mode = event.target.value;
                  setEditGenderMode(mode);

                  if (mode === "other" || mode === "") {
                    if (mode === "") {
                      setEditDraftState((current) => ({ ...current, gender: "" }));
                    }
                    return;
                  }

                  setEditDraftState((current) => ({ ...current, gender: mode }));
                }}
                options={GENDER_PRESET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={editGenderMode}
              />
            </FormField>
            {editGenderMode === "other" ? (
              <FormField label="Gender (other)">
                <Input onChange={(event) => setEditDraftState((current) => ({ ...current, gender: event.target.value }))} value={editDraftState.gender} />
              </FormField>
            ) : null}
            <FormField label="Jersey size">
              <Input onChange={(event) => setEditDraftState((current) => ({ ...current, jerseySize: event.target.value }))} value={editDraftState.jerseySize} />
            </FormField>
            <FormField className="md:col-span-2" label="Medical notes">
              <Textarea className="min-h-[90px]" onChange={(event) => setEditDraftState((current) => ({ ...current, medicalNotes: event.target.value }))} value={editDraftState.medicalNotes} />
            </FormField>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-semibold text-text">Guardians</p>
              {editingPlayerWithGuardians && editingPlayerWithGuardians.guardians.length === 0 ? <Alert variant="info">No guardians linked.</Alert> : null}
              {editingPlayerWithGuardians?.guardians.map((guardian) => (
                <div className="rounded-control border bg-surface px-3 py-2 text-xs text-text-muted" key={guardian.id}>
                  <p>User ID: {guardian.guardianUserId}</p>
                  <p>
                    Relationship: {guardian.relationship ?? "Unspecified"} · {guardian.canManage ? "Can manage" : "Read only"}
                  </p>
                </div>
              ))}
            </div>
            {editingPlayerId ? (
              <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                <FormField className="md:col-span-2" label="Link guardian by existing account email">
                  <Input
                    onChange={(event) =>
                      setGuardianEmailByPlayerId((current) => ({
                        ...current,
                        [editingPlayerId]: event.target.value
                      }))
                    }
                    required
                    type="email"
                    value={guardianEmailByPlayerId[editingPlayerId] ?? ""}
                  />
                </FormField>
                <FormField className="md:col-span-2" label="Relationship">
                  <Input
                    onChange={(event) =>
                      setGuardianRelationshipByPlayerId((current) => ({
                        ...current,
                        [editingPlayerId]: event.target.value
                      }))
                    }
                    value={guardianRelationshipByPlayerId[editingPlayerId] ?? ""}
                  />
                </FormField>
                <div className="md:col-span-2">
                  <Button
                    disabled={isLinkingByPlayerId[editingPlayerId] ?? false}
                    loading={isLinkingByPlayerId[editingPlayerId] ?? false}
                    onClick={() => handleLinkGuardian(editingPlayerId)}
                    type="button"
                    variant="secondary"
                  >
                    {isLinkingByPlayerId[editingPlayerId] ? "Linking..." : "Link guardian"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="md:col-span-2 flex items-center gap-2">
              <Button disabled={isSavingEdit} loading={isSavingEdit} type="submit" variant="secondary">
                {isSavingEdit ? "Saving..." : "Save player"}
              </Button>
              <Button disabled={isSavingEdit} onClick={closeEdit} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
