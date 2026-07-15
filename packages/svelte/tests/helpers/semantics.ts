const ID_REFERENCE_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
] as const;

export interface SemanticNode {
  tag: string;
  role: string | null;
  name: string;
  states: Record<string, string>;
}

function escapeId(id: string): string {
  return globalThis.CSS?.escape(id) ?? id.replaceAll(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export function assertUniqueIds(root: ParentNode): void {
  const ids = new Map<string, number>();
  for (const node of root.querySelectorAll<HTMLElement>("[id]")) {
    ids.set(node.id, (ids.get(node.id) ?? 0) + 1);
  }
  const duplicates = [...ids].filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate ids: ${duplicates.join(", ")}`);
  }
}

export function assertIdReferencesResolve(root: ParentNode): void {
  const unresolved: string[] = [];
  for (const attribute of ID_REFERENCE_ATTRIBUTES) {
    for (const node of root.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
      for (const id of (node.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean)) {
        if (root.querySelector(`#${escapeId(id)}`) === null) {
          unresolved.push(`${attribute}="${id}"`);
        }
      }
    }
  }
  if (unresolved.length > 0) {
    throw new Error(`Unresolved ARIA id references: ${unresolved.join(", ")}`);
  }
}

function semanticName(node: HTMLElement): string {
  const labelledBy = node.getAttribute("aria-labelledby");
  if (labelledBy !== null && labelledBy !== "") {
    return labelledBy
      .split(/\s+/)
      .map((id) => node.ownerDocument.querySelector(`#${escapeId(id)}`)?.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
  }
  return node.getAttribute("aria-label") ?? node.textContent?.trim() ?? "";
}

export function getSemanticSnapshot(root: ParentNode): SemanticNode[] {
  const selector = [
    "[aria-label]",
    "[aria-labelledby]",
    "[role]",
    "button",
    "input",
    "select",
    "textarea",
  ].join(",");
  const nodes = [...root.querySelectorAll<HTMLElement>(selector)].filter(
    (node) => node.closest('[aria-hidden="true"]') === null,
  );
  return nodes.map((node) => {
    const states: Record<string, string> = {};
    for (const state of ["checked", "disabled", "expanded", "live", "pressed", "selected"]) {
      const value = node.getAttribute(`aria-${state}`);
      if (value !== null) states[state] = value;
    }
    return {
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute("role"),
      name: semanticName(node),
      states,
    };
  });
}
