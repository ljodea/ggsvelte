/**
 * Live-SVG parity gate (#1471): update a ggsvelte-svg mount in place twice
 * (both perturbation variants), then compare the patched DOM against a FRESH
 * mount of the same final data. The fresh mount's initial tree comes from
 * sceneToSVGString + innerHTML (the pre-#1471 behavior), so
 * isEqualNode equality means the incremental patcher produces exactly the
 * DOM the full re-render would have produced.
 * Returns the first mismatching node path when unequal.
 */
import { mountGgsvelteSvg } from "../adapters/ggsvelte-svg";
import { dataForCase, perturbForUpdate } from "../scenarios";
import { caseById } from "./lifecycle";

export function parityLiveSvg(caseId: string): { equal: boolean; detail: string } {
  const c = caseById(caseId);
  const data = dataForCase(c);
  const rootA = document.createElement("div");
  const rootB = document.createElement("div");
  const a = mountGgsvelteSvg(c.scenario, data, rootA);
  const finalData = perturbForUpdate(data, 2);
  a.handle.update?.(perturbForUpdate(data, 1));
  a.handle.update?.(finalData);
  const b = mountGgsvelteSvg(c.scenario, finalData, rootB);
  const elA = rootA.firstElementChild;
  const elB = rootB.firstElementChild;

  const describe = (el: Element): string => {
    const attrs = Array.from(el.attributes)
      .map((at) => `${at.name}=${at.value}`)
      .join(" ");
    return `<${el.tagName} ${attrs}>`;
  };
  const firstDiff = (x: Node, y: Node, path: string): string | null => {
    if (x.nodeType !== y.nodeType) return `${path}: nodeType ${x.nodeType} vs ${y.nodeType}`;
    if (x instanceof Element && y instanceof Element) {
      if (x.tagName !== y.tagName) return `${path}: <${x.tagName}> vs <${y.tagName}>`;
      if (x.attributes.length !== y.attributes.length) {
        return `${path}: attr count ${describe(x)} vs ${describe(y)}`;
      }
      for (const at of Array.from(x.attributes)) {
        const other = y.getAttributeNS(at.namespaceURI, at.localName);
        if (other !== at.value) {
          return `${path}: ${at.name}="${at.value}" vs "${other}" (${describe(y)})`;
        }
      }
    }
    if (x.textContent !== y.textContent && x.childNodes.length === 0) {
      return `${path}: text "${x.textContent}" vs "${y.textContent}"`;
    }
    const xc = Array.from(x.childNodes);
    const yc = Array.from(y.childNodes);
    if (xc.length !== yc.length) {
      return `${path}: children ${xc.length} vs ${yc.length} (${describe(x as Element)})`;
    }
    for (let i = 0; i < xc.length; i++) {
      const d = firstDiff(xc[i]!, yc[i]!, `${path}/${xc[i]!.nodeName}[${i}]`);
      if (d !== null) return d;
    }
    return null;
  };

  let equal = false;
  let detail = "no root element";
  if (elA !== null && elB !== null) {
    equal = elA.isEqualNode(elB);
    detail = equal
      ? "patched DOM identical to fresh render"
      : (firstDiff(elA, elB, "svg") ?? "differs");
  }
  a.handle.destroy();
  b.handle.destroy();
  return { equal, detail };
}
