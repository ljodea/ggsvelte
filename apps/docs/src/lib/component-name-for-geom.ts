/**
 * snake_case geom → GeomPascalCase component name.
 *
 * Docs-local copy of the pure helper from @ggsvelte/spec so reference client
 * modules never value-import the package barrel.
 */
export function componentNameForGeom(geom: string): string {
  const pascal = geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Geom${pascal}`;
}
