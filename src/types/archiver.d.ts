declare module "archiver" {
  import type { Readable } from "node:stream";

  export interface ArchiverOptions {
    zlib?: { level?: number };
  }

  export class Archiver extends Readable {
    directory(dirpath: string, destpath: boolean | string): this;
    finalize(): Promise<void>;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }
}
