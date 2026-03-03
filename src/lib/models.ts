export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const MODELS: ModelOption[] = [
  { id: "claude-haiku-4-5", name: "Haiku", description: "Fast" },
  { id: "claude-sonnet-4-6", name: "Sonnet", description: "Balanced" },
  { id: "claude-opus-4-6", name: "Opus", description: "Most capable" },
];

export const DEFAULT_MODEL = "claude-haiku-4-5";
