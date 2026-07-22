export type PrimaryNavOwner = "docs" | "reference";

export type PrimaryNavLink = {
  readonly label: string;
  readonly href: string;
  readonly active: boolean;
};

/** Primary site chrome links shared by desktop nav and the mobile menu. */
export function primaryNavLinks(path: string, owner?: PrimaryNavOwner): readonly PrimaryNavLink[] {
  return [
    {
      label: "Docs",
      href: "/docs",
      active: owner === "docs",
    },
    {
      label: "Gallery",
      href: "/examples",
      active: path.startsWith("/examples"),
    },
    {
      label: "Playground",
      href: "/playground",
      active: path === "/playground",
    },
    {
      label: "Themes",
      href: "/themes",
      active: path === "/themes",
    },
    {
      label: "Interactions",
      href: "/interactions",
      active: path === "/interactions",
    },
    {
      label: "Reference",
      href: "/reference",
      active: owner === "reference",
    },
  ];
}
