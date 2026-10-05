export type FlowTextOption = {
  fontSize: number;
  fontColors: string[];
  flowAreas: number[];
  testMode: boolean;
  wsUrl?: string;
  /** Time taken for one comment to cross the screen, in seconds (3–30). */
  flowDurationSeconds?: number;
};
