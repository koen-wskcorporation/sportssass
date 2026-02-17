"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonListEditor } from "@/components/editor/buttons/ButtonListEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { defaultInternalHref, type SiteButton } from "@/lib/links";
import { deleteAnnouncementAction, saveAnnouncementAction } from "@/modules/announcements/actions";
import type { OrgAnnouncement } from "@/modules/announcements/types";

type AnnouncementsManagePanelProps = {
  orgSlug: string;
  announcements: OrgAnnouncement[];
};

type AnnouncementDraft = {
  id?: string;
  title: string;
  summary: string;
  publishAt: string;
  isPublished: boolean;
  button: SiteButton | null;
};

function toDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIsoOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toDraft(announcement: OrgAnnouncement): AnnouncementDraft {
  return {
    id: announcement.id,
    title: announcement.title,
    summary: announcement.summary,
    publishAt: toDatetimeLocal(announcement.publishAt),
    isPublished: announcement.isPublished,
    button: announcement.button
  };
}

function createNewDraft(): AnnouncementDraft {
  return {
    title: "",
    summary: "",
    publishAt: "",
    isPublished: false,
    button: {
      id: "announcement-button",
      label: "Read more",
      href: defaultInternalHref("home"),
      variant: "secondary"
    }
  };
}

export function AnnouncementsManagePanel({ orgSlug, announcements }: AnnouncementsManagePanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [newDraft, setNewDraft] = useState<AnnouncementDraft>(createNewDraft());
  const [draftsById, setDraftsById] = useState<Record<string, AnnouncementDraft>>(() => {
    return announcements.reduce<Record<string, AnnouncementDraft>>((acc, announcement) => {
      acc[announcement.id] = toDraft(announcement);
      return acc;
    }, {});
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((left, right) => {
      const leftTime = left.publishAt ? new Date(left.publishAt).getTime() : 0;
      const rightTime = right.publishAt ? new Date(right.publishAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [announcements]);

  function updateExistingDraft(announcementId: string, patch: Partial<AnnouncementDraft>) {
    setDraftsById((current) => ({
      ...current,
      [announcementId]: {
        ...(current[announcementId] ?? createNewDraft()),
        ...patch
      }
    }));
  }

  function updateNewDraft(patch: Partial<AnnouncementDraft>) {
    setNewDraft((current) => ({
      ...current,
      ...patch
    }));
  }

  function saveDraft(draft: AnnouncementDraft) {
    if (!draft.title.trim() || !draft.summary.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and summary are required.",
        variant: "destructive"
      });
      return;
    }

    startSavingTransition(async () => {
      const result = await saveAnnouncementAction({
        orgSlug,
        id: draft.id,
        title: draft.title,
        summary: draft.summary,
        publishAt: toIsoOrNull(draft.publishAt),
        isPublished: draft.isPublished,
        button: draft.button
      });

      if (!result.ok) {
        toast({
          title: "Save failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      if (!draft.id) {
        setNewDraft(createNewDraft());
      }

      toast({
        title: "Announcement saved",
        variant: "success"
      });
      router.refresh();
    });
  }

  function deleteAnnouncement(announcementId: string) {
    startDeleteTransition(async () => {
      const result = await deleteAnnouncementAction({
        orgSlug,
        announcementId
      });

      if (!result.ok) {
        toast({
          title: "Delete failed",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setDeleteId(null);
      toast({
        title: "Announcement deleted",
        variant: "success"
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add announcement</CardTitle>
          <CardDescription>Create a new announcement and set publish controls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField label="Title">
            <Input onChange={(event) => updateNewDraft({ title: event.target.value })} value={newDraft.title} />
          </FormField>
          <FormField label="Summary">
            <Textarea
              className="min-h-[100px]"
              onChange={(event) => updateNewDraft({ summary: event.target.value })}
              value={newDraft.summary}
            />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Publish date">
              <Input
                onChange={(event) => updateNewDraft({ publishAt: event.target.value })}
                type="datetime-local"
                value={newDraft.publishAt}
              />
            </FormField>
            <FormField label="Published">
              <label className="inline-flex h-10 items-center gap-2 rounded-control border bg-surface px-3 text-sm">
                <input
                  checked={newDraft.isPublished}
                  onChange={(event) => updateNewDraft({ isPublished: event.target.checked })}
                  type="checkbox"
                />
                Visible on site
              </label>
            </FormField>
          </div>
          <ButtonListEditor
            maxButtons={1}
            onChange={(buttons) => updateNewDraft({ button: buttons[0] ?? null })}
            orgSlug={orgSlug}
            title="Button"
            value={newDraft.button ? [newDraft.button] : []}
          />
          <Button disabled={isSaving} onClick={() => saveDraft(newDraft)}>
            {isSaving ? "Saving..." : "Save announcement"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing announcements</CardTitle>
          <CardDescription>Edit, publish, or remove announcements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedAnnouncements.length === 0 ? (
            <Alert variant="info">No announcements yet.</Alert>
          ) : (
            sortedAnnouncements.map((announcement) => {
              const draft = draftsById[announcement.id] ?? toDraft(announcement);

              return (
                <Card key={announcement.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{announcement.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FormField label="Title">
                      <Input
                        onChange={(event) => updateExistingDraft(announcement.id, { title: event.target.value })}
                        value={draft.title}
                      />
                    </FormField>
                    <FormField label="Summary">
                      <Textarea
                        className="min-h-[100px]"
                        onChange={(event) => updateExistingDraft(announcement.id, { summary: event.target.value })}
                        value={draft.summary}
                      />
                    </FormField>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Publish date">
                        <Input
                          onChange={(event) => updateExistingDraft(announcement.id, { publishAt: event.target.value })}
                          type="datetime-local"
                          value={draft.publishAt}
                        />
                      </FormField>
                      <FormField label="Published">
                        <label className="inline-flex h-10 items-center gap-2 rounded-control border bg-surface px-3 text-sm">
                          <input
                            checked={draft.isPublished}
                            onChange={(event) => updateExistingDraft(announcement.id, { isPublished: event.target.checked })}
                            type="checkbox"
                          />
                          Visible on site
                        </label>
                      </FormField>
                    </div>
                    <ButtonListEditor
                      maxButtons={1}
                      onChange={(buttons) => updateExistingDraft(announcement.id, { button: buttons[0] ?? null })}
                      orgSlug={orgSlug}
                      title="Button"
                      value={draft.button ? [draft.button] : []}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={isSaving} onClick={() => saveDraft(draft)} size="sm" variant="secondary">
                        {isSaving ? "Saving..." : "Save changes"}
                      </Button>
                      <Button onClick={() => setDeleteId(announcement.id)} size="sm" variant="destructive">
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog onClose={() => setDeleteId(null)} open={Boolean(deleteId)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete announcement</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteId(null)} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!deleteId || isDeleting}
              onClick={() => {
                if (!deleteId) {
                  return;
                }

                deleteAnnouncement(deleteId);
              }}
              size="sm"
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
