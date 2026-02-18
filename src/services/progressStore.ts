export type Progress = {
  best: number;
};

export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
}