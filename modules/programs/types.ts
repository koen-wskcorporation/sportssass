export type ProgramType = "league" | "season" | "clinic" | "custom";

export type ProgramStatus = "draft" | "published" | "archived";

export type ProgramNodeKind = "division" | "subdivision";

export type ProgramScheduleBlockType = "date_range" | "meeting_pattern" | "one_off";

export type Program = {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  programType: ProgramType;
  customTypeLabel: string | null;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImagePath: string | null;
  settingsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ProgramNode = {
  id: string;
  programId: string;
  parentId: string | null;
  name: string;
  slug: string;
  nodeKind: ProgramNodeKind;
  sortIndex: number;
  capacity: number | null;
  waitlistEnabled: boolean;
  settingsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ProgramScheduleBlock = {
  id: string;
  programId: string;
  programNodeId: string | null;
  blockType: ProgramScheduleBlockType;
  title: string | null;
  timezone: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  byDay: number[] | null;
  oneOffAt: string | null;
  sortIndex: number;
  settingsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ProgramCatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  programType: ProgramType;
  customTypeLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImagePath: string | null;
  coverImageUrl?: string | null;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  settingsJson: Record<string, unknown>;
};

export type ProgramWithDetails = {
  program: Program;
  nodes: ProgramNode[];
  scheduleBlocks: ProgramScheduleBlock[];
};
