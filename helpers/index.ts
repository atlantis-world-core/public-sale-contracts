export * from "./generate";
export * from "./merkle";
export * from "./time";

import * as fs from "fs";

export function generateArray(length: number) {
  return Array.from({ length }, (v, i) => i);
}

export function unqiueArray(array: any[]) {
  return [...new Set(array)];
}

export async function exportJson(fileName: string, data: object) {
  // console.log("🗄️ Exporting data into JSON file...", data);

  fs.writeFileSync(fileName, JSON.stringify(data), "utf-8");

  console.log("✅ Data export done!");
}
