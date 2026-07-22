export type PlaygroundOutputKind = "svelte" | "builder" | "portable-spec";

export interface PlaygroundOutput {
  readonly kind: PlaygroundOutputKind;
  readonly label: string;
  readonly supported: boolean;
  readonly code: string;
  readonly reason?: string;
}
