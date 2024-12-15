import type { Agent } from '@/1-data/type/Agent';

export type Capability<Args extends any[] = any[], Return = any> = (
  ...args: Args
) => Promise<Return>;

export interface Role {
  id: string;
  displayName: string;
  capabilities: readonly Capability[];
}

export interface Assignment {
  userId: Agent['id'];
  roleId: Role['id'];
}

export interface Domain {
  id: string;
  displayName: string;
  capabilities: readonly Capability[];
  roles: Record<Role['id'], Role>;
  assignments: Record<Agent['id'], Assignment>;
  agents: readonly Agent['id'][];
  subDomains: Record<Domain['id'], Domain>;
  parentDomain?: Domain;
}
