/**
 * Compile-only: SpecModule.Import accepts only named SpecDeclarations keys.
 */
import { SpecModule } from "../src/schema.js";

// Valid roots used by the public Import surface.
SpecModule.Import("PlotSpec");
SpecModule.Import("LayerSpec");
SpecModule.Import("Scales");
SpecModule.Import("CoordSpec");

// @ts-expect-error SpecModule.Import rejects keys outside SpecDeclarations
SpecModule.Import("NotADef");
