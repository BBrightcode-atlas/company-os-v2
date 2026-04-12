import type { FeedbackDataSharingPreference } from "./feedback.js";

export interface InstanceGeneralSettings {
  censorUsernameInLogs: boolean;
  keyboardShortcuts: boolean;
  locale: "en" | "ko";
  feedbackDataSharingPreference: FeedbackDataSharingPreference;
}

export interface InstanceExperimentalSettings {
  enableIsolatedWorkspaces: boolean;
  autoRestartDevServerWhenIdle: boolean;
  enableAutoAssignment: boolean;
}

export interface InstanceSettings {
  id: string;
  general: InstanceGeneralSettings;
  experimental: InstanceExperimentalSettings;
  createdAt: Date;
  updatedAt: Date;
}
