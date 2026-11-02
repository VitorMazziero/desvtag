import { describe, expect, it, vi } from "vitest";
import { scrollToStep } from "./scrollToStep";

function fakeRoot() {
  const heading = document.createElement("h2");
  document.body.append(heading);
  const root = {
    scrollIntoView: vi.fn(),
    querySelector: vi.fn(() => heading),
  };
  return { root, heading };
}

describe("scrollToStep", () => {
  it("rola suavemente até o topo do fluxo e foca o título sem rolar de novo", () => {
    const { root, heading } = fakeRoot();
    const focus = vi.spyOn(heading, "focus");
    expect(scrollToStep(root, false)).toBe("smooth");
    expect(root.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("sem animação quando o movimento é reduzido", () => {
    const { root } = fakeRoot();
    expect(scrollToStep(root, true)).toBe("auto");
    expect(root.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("não falha sem o elemento ou sem scrollIntoView", () => {
    expect(scrollToStep(null, false)).toBe("smooth");
    const heading = document.createElement("h2");
    expect(() => scrollToStep({ querySelector: () => heading }, false)).not.toThrow();
  });
});
