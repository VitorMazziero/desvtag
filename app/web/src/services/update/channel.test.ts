import { beforeEach, describe, expect, it } from "vitest";
import { defaultChannel, loadChannel, saveChannel } from "./channel";

describe("update channel", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to experimental in the 0.x series and stable from 1.0.0", () => {
    expect(defaultChannel("0.3.0")).toBe("experimental");
    expect(defaultChannel("1.0.0")).toBe("stable");
    expect(defaultChannel("1.2.0-rc.1")).toBe("stable");
  });

  it("remembers the choice on the device and ignores unknown values", () => {
    expect(loadChannel("0.3.0")).toBe("experimental");
    saveChannel("stable");
    expect(loadChannel("0.3.0")).toBe("stable");
    localStorage.setItem("optima.updateChannel", "beta");
    expect(loadChannel("0.3.0")).toBe("experimental");
  });
});
