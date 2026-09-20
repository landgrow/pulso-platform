import type {
  AutomationChannel,
  AutomationTrigger,
  IntegrationKind,
} from "@/lib/integrations/catalog";

export type IntegrationStatus = "connected" | "pending" | "disabled";

export interface WorkspaceIntegration {
  id: string;
  kind: IntegrationKind;
  name: string;
  status: IntegrationStatus;
  config: Record<string, string>;
  created_at: string;
}

export interface WorkspaceAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  channel: AutomationChannel;
  enabled: boolean;
  config: Record<string, string>;
  created_at: string;
}
