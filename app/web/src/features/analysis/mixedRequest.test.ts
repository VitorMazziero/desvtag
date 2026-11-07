import { describe, expect, it } from "vitest";
import { createI18n } from "../../i18n";

const i18n = createI18n("pt-BR");

import { initialProject, type ProjectState } from "../../state/project";
import { defaultMixedOptions } from "./MixedOptions";
import { mixedAdvancedRequest } from "./mixedRequest";

const state: ProjectState = {
  ...initialProject,
  rows: [
    { id: "o1", unitId: "A", factors: [], responses: [], timeText: "0,5" },
    { id: "o2", unitId: "A", factors: [], responses: [], timeText: "1,5" },
  ],
};
describe("advanced repeated input mapping", () => {
  it("parses raw time and preserves empty cells without scientific aggregation", () => {
    const s = {
      ...state,
      rows: [...state.rows, { id: "o3", unitId: "B", factors: [], responses: [], timeText: "" }],
    };
    const got = mixedAdvancedRequest(s, { ...defaultMixedOptions, timeEnabled: true }, i18n.t);
    expect(got.problems).toEqual([]);
    expect(got.request?.times).toEqual([0.5, 1.5, null]);
  });
  it("maps explicit ordered labels and retains historical names", () => {
    const s = {
      ...state,
      rows: state.rows.map((r, i) => ({ ...r, timeText: ["Depois", "Antes"][i] })),
    };
    const got = mixedAdvancedRequest(
      s,
      { ...defaultMixedOptions, timeEnabled: true, occasionOrder: "Antes; Depois" },
      i18n.t,
    );
    expect(got.request?.times).toEqual([1, 0]);
    expect(got.request?.timeLabels).toEqual([
      { index: 0, label: "Antes" },
      { index: 1, label: "Depois" },
    ]);
  });
  it("blocks unmapped or invalid values instead of turning them into missing", () => {
    const bad = { ...state, rows: [{ ...state.rows[0]!, timeText: "unknown" }] };
    for (const occasionOrder of ["", "Antes; Depois", "Antes; Antes"]) {
      const got = mixedAdvancedRequest(
        bad,
        { ...defaultMixedOptions, timeEnabled: true, occasionOrder },
        i18n.t,
      );
      expect(got.problems.length).toBeGreaterThan(0);
      expect(got.request).toBeUndefined();
    }
  });
});
