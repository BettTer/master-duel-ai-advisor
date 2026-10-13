import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const CACHE_DIR = process.env.MDAA_CACHE_DIR ?? join(homedir(), ".cache", "master-duel-ai-advisor");
export const CONFIG_DIR = process.env.MDAA_CONFIG_DIR ?? join(homedir(), ".config", "master-duel-ai-advisor");

export const DAY = 24 * 3600;

export function cachePath(name: string): string {
  return join(CACHE_DIR, name);
}

/** Seconds since the file was last written, or Infinity if it does not exist. */
export function ageOf(path: string): number {
  return existsSync(path) ? (Date.now() - statSync(path).mtimeMs) / 1000 : Infinity;
}

export function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}
