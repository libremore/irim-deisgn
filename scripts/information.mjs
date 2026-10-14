import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const INFORMATION_TEMPLATE = readFileSync(new URL("../portfolio/INFORMATION.template.md", import.meta.url), "utf8");

// Parse only the documented sections; comments are instructions for the editor.
// Values remain plain text and are escaped when rendered into HTML.
export function readProjectInformation(directory) {
  const path = join(directory, "INFORMATION.md");
  const information = { apartmentName: "", region: "", address: "", description: "" };
  if (!existsSync(path)) return information;
  const source = readFileSync(path, "utf8").replace(/^\uFEFF/, "").replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  const sections = { "아파트명과 지역": [], "주소": [], "포트폴리오에 대한 추가적인 설명": [] };
  let current;
  for (const line of source.split(/\r?\n/)) {
    const heading = /^#{1,6}\s+(?:\d+[.)]\s*)?(.+?)\s*#*\s*$/.exec(line);
    if (heading && Object.hasOwn(sections, heading[1])) {
      current = sections[heading[1]];
    } else if (current) {
      current.push(line);
    }
  }
  for (const line of sections["아파트명과 지역"]) {
    const field = /^\s*(?:[-*+]\s+)?(?:\*\*)?(아파트명|상가명|공간명|지역)(?:\*\*)?\s*:\s*(.*?)\s*$/.exec(line);
    if (!field) continue;
    information[field[1] === "지역" ? "region" : "apartmentName"] = field[2];
  }
  information.address = sections["주소"].join("\n").trim();
  information.description = sections["포트폴리오에 대한 추가적인 설명"].join("\n").trim();
  return information;
}
