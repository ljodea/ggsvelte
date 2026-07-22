import type { PortableSpec } from "@ggsvelte/spec";

import type { PlaygroundSeedV1 } from "./playground-codec";

export type PlaygroundDiagnosticSource = "playground" | "validation" | "pipeline" | "export";

export interface PlaygroundDiagnostic {
  readonly source: PlaygroundDiagnosticSource;
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly fix?: string;
}

export type PlaygroundCandidateOrigin =
  | "apply"
  | "source"
  | "reset"
  | "undo"
  | "initial-navigation"
  | "popstate";

export interface PlaygroundSnapshot {
  readonly sourceBaseline: PlaygroundSeedV1;
  readonly seed: PlaygroundSeedV1;
  readonly draft: string;
  readonly committed: PortableSpec;
  readonly rendered: PortableSpec;
  readonly renderConfirmed: boolean;
  readonly historyHash: string | null;
}

export interface PlaygroundCandidate {
  readonly generation: number;
  readonly origin: PlaygroundCandidateOrigin;
  readonly next: PlaygroundSnapshot;
  readonly undoSnapshotsAfterPromotion?: readonly PlaygroundSnapshot[];
}

export interface PlaygroundNavigationRecovery {
  readonly replaceHash: string | null;
  readonly preserveForward: true;
}

export interface PlaygroundState extends PlaygroundSnapshot {
  readonly candidate: PlaygroundCandidate | null;
  readonly diagnostics: readonly PlaygroundDiagnostic[];
  readonly lastValid: boolean;
  readonly status: string;
  readonly nextGeneration: number;
  readonly undoSnapshots: readonly PlaygroundSnapshot[];
  readonly synchronized: boolean;
  readonly canCopyOrShare: boolean;
  readonly navigationRecovery: PlaygroundNavigationRecovery | null;
  readonly historyIntent: "none";
}

export const PLAYGROUND_MAX_UNDO_SNAPSHOTS = 20;
