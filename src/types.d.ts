declare module 'lighthouse' {
  import type LHR from 'lighthouse/types/lhr/lhr.js';
  import type { SharedFlagsSettings } from 'lighthouse/types/lhr/settings.js';
  export type LHR = LHR.default;
  interface LighthouseResult {
    lhr: LHR.default;
    report: any;
  }
  export interface LHOptions extends SharedFlagsSettings {
    output?: 'json' | 'html' | 'csv';
    port?: number;
  }
  const run: (url: string, opts: LHOptions) => Promise<LighthouseResult>;
  export default run;
}
