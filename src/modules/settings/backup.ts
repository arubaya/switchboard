import { ZipArchive } from "archiver";
import type { Archiver } from "archiver";

import { dataDir } from "../../shared/paths.js";

export function createBackupFilename(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    "switchboard-backup-",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    ".zip",
  ].join("");
}

export function createBackupArchive(): Archiver {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.directory(dataDir, false);
  void archive.finalize();
  return archive;
}
