import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const popupPath = resolve(process.cwd(), "src/features/site/components/SiteStructureEditorPopup.tsx");
const popupSource = readFileSync(popupPath, "utf8");

describe("site structure popup guardrails", () => {
  it("keeps map rows and root shell rendered with StructureNode", () => {
    assert.match(popupSource, /<StructureCanvas/);
    assert.match(popupSource, /rows\.map\(/);
    assert.match(popupSource, /rootHeader=\{/);
    assert.match(popupSource, /<StructureNode/g);
    assert.doesNotMatch(popupSource, /\bRowNode\b/);
    assert.doesNotMatch(popupSource, /\bDropZone\b/);
  });

  it("renders explicit drop-target structure node and forbids old helper names", () => {
    assert.match(popupSource, /appearance="drop"/);
    assert.match(popupSource, /nodeId="site-structure-end-cap"/);
    assert.doesNotMatch(popupSource, /\bRowNode\b/);
    assert.doesNotMatch(popupSource, /\bDropZone\b/);
  });
});
