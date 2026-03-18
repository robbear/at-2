import type { Marker } from "@at-2/shared";

// Compile-time check: confirms @at-2/shared types are resolvable from this package.
// The type is used in a function signature to avoid "unused" lint warnings.
function assertMarkerType(_m: Marker): void {
  /* type-only assertion, never called at runtime */
}
void assertMarkerType;

export default function HomePage(): React.ReactElement {
  return (
    <main>
      <h1>Atlasphere</h1>
    </main>
  );
}
