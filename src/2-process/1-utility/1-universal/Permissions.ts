import type { Agent } from '@/1-data/type/Agent';
import type {
  Capability,
  Domain,
  Role,
  Assignment,
} from '@/1-data/type/Domain';
import { MeetingCapability } from '@/2-process/2-engine/store/MeetingActions';

export class PermissionManager {
  private domains: Record<Domain['id'], Domain> = {};
  private roles: Record<Role['id'], Role> = {};

  constructor(systemDomain: Domain) {
    this.mapDomains(systemDomain);
  }

  private mapDomains(domain: Domain): void {
    this.domains[domain.id] = domain;
    Object.values(domain.roles).forEach((role) => {
      this.roles[role.id] = role;
    });
    Object.values(domain.subDomains).forEach((subdomain) => {
      subdomain.parentDomain = domain;
      this.mapDomains(subdomain);
    });
  }

  isAuthorized(userId: Agent['id'], capability: Capability): boolean {
    return Object.values(this.domains).some((domain) => {
      const assignment = domain.assignments[userId];
      if (assignment) {
        const role = domain.roles[assignment.roleId];
        if (
          role?.capabilities.includes(capability) &&
          domain.capabilities.includes(capability)
        ) {
          return true;
        }
      }
      return false;
    });
  }

  getDomain(id: Domain['id']): Domain | undefined {
    return this.domains[id];
  }

  getRole(id: Role['id']): Role | undefined {
    return this.roles[id];
  }

  async assignRoleToUser(
    assignerId: Agent['id'],
    domain: Domain,
    userId: Agent['id'],
    roleId: Role['id']
  ): Promise<void> {
    // Check if assigner has permission to assign roles
    if (!this.isAuthorized(assignerId, SystemCapability.ASSIGN_ROLE)) {
      throw new Error('Not authorized to assign roles');
    }
    await SystemCapability.ASSIGN_ROLE(domain, userId, roleId);
  }
}

export const SystemCapability = {
  ADD_ROLE: async (domain: Domain, role: Role): Promise<void> => {
    if (domain.roles[role.id]) {
      throw new Error('Role already exists');
    }
    domain.roles[role.id] = role;
  },

  ASSIGN_ROLE: async (
    domain: Domain,
    userId: Agent['id'],
    roleId: Role['id']
  ): Promise<void> => {
    if (!domain.roles[roleId]) {
      throw new Error('Invalid role');
    }
    const assignment: Assignment = { userId, roleId };
    (domain.agents as Agent['id'][]).push(userId);
    domain.assignments[userId] = assignment;
  },

  REVOKE_ROLE: async (domain: Domain, userId: Agent['id']): Promise<void> => {
    delete domain.assignments[userId];
    (domain.agents as Agent['id'][]) = domain.agents.filter(
      (id) => id !== userId
    );
  },

  ADD_SUBDOMAIN: async (
    parentDomain: Domain,
    newDomain: Domain
  ): Promise<void> => {
    if (parentDomain.subDomains[newDomain.id]) {
      throw new Error('Subdomain already exists');
    }
    newDomain.parentDomain = parentDomain;
    parentDomain.subDomains[newDomain.id] = newDomain;
  },
} as const;

export type SystemCapabilities = typeof SystemCapability;

function createMeetingDomain(): Domain {
  const meetingCapabilities = [
    MeetingCapability.JOIN_MEETING,
    MeetingCapability.LEAVE_MEETING,
    MeetingCapability.UPDATE_PHASE,
    MeetingCapability.START_MEETING,
    MeetingCapability.STOP_MEETING,
  ];

  const meetingExecutorRole: Role = {
    id: 'meeting-executor',
    displayName: 'Meeting Executor',
    capabilities: meetingCapabilities,
  };

  const meetingParticipantRole: Role = {
    id: 'meeting-participant',
    displayName: 'Meeting Participant',
    capabilities: [
      MeetingCapability.JOIN_MEETING,
      MeetingCapability.LEAVE_MEETING,
    ],
  };

  return {
    id: 'meeting',
    displayName: 'Meeting',
    capabilities: meetingCapabilities,
    roles: {
      'meeting-executor': meetingExecutorRole,
      'meeting-participant': meetingParticipantRole,
    },
    assignments: {},
    agents: [],
    subDomains: {},
  };
}

export function createSystemDomain(): Domain {
  const systemCapabilities = [
    SystemCapability.ADD_ROLE,
    SystemCapability.ASSIGN_ROLE,
    SystemCapability.REVOKE_ROLE,
    SystemCapability.ADD_SUBDOMAIN,
  ];

  const systemAdminRole: Role = {
    id: 'system-admin',
    displayName: 'System Administrator',
    capabilities: systemCapabilities,
  };

  const systemDomain: Domain = {
    id: 'system',
    displayName: 'System',
    capabilities: systemCapabilities,
    roles: { 'system-admin': systemAdminRole },
    assignments: {},
    agents: [],
    subDomains: {},
  };

  // Add meeting domain as a subdomain
  const meetingDomain = createMeetingDomain();
  meetingDomain.parentDomain = systemDomain;
  systemDomain.subDomains.meeting = meetingDomain;

  return systemDomain;
}

export const permissionManager = new PermissionManager(createSystemDomain());
