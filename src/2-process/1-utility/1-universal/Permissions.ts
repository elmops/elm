import type { Agent } from '@/1-data/type/Agent';
import type {
  Capability,
  Domain,
  Role,
  Assignment,
} from '@/1-data/type/Domain';

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

export function createSystemDomain(): Domain {
  const systemCapabilities = [
    SystemCapability.ADD_ROLE,
    SystemCapability.ASSIGN_ROLE,
    SystemCapability.REVOKE_ROLE,
    SystemCapability.ADD_SUBDOMAIN,
  ] as const;

  const systemAdminRole: Role = {
    id: 'system-admin',
    displayName: 'System Administrator',
    capabilities: systemCapabilities,
  };

  return {
    id: 'system',
    displayName: 'System',
    capabilities: systemCapabilities,
    roles: { 'system-admin': systemAdminRole },
    assignments: {},
    agents: [],
    subDomains: {},
  } as const;
}

export const permissionManager = new PermissionManager(createSystemDomain());
// // Old code
// export class PermissionManager {
//   private roles: Map<number, Role> = new Map(
//     Object.values(Roles).map((role) => [role.id, role])
//   );

//   /**
//    * Check if an agent has permission in a specific context
//    */
//   hasPermission(
//     agent: Agent,
//     context: Context,
//     permission: Permission | number
//   ): boolean {
//     return agent.roles.some((roleId) => {
//       const role = this.roles.get(roleId);
//       if (!role) return false;

//       // Check if role applies to this context
//       if ((role.context & context) === 0) return false;

//       // Check if role has all requested permissions
//       return (role.permissions & permission) === permission;
//     });
//   }

//   /**
//    * Check multiple permissions at once
//    */
//   hasPermissions(
//     agent: Agent,
//     context: Context,
//     permissions: Permission[]
//   ): boolean {
//     const combinedPermissions = permissions.reduce((acc, p) => acc | p, 0);
//     return this.hasPermission(agent, context, combinedPermissions);
//   }

//   /**
//    * Get all permissions for an agent in a specific context
//    */
//   getPermissions(agent: Agent, context: Context): number {
//     return agent.roles.reduce((acc, roleId) => {
//       const role = this.roles.get(roleId);
//       if (!role || (role.context & context) === 0) return acc;
//       return acc | role.permissions;
//     }, 0);
//   }

//   /**
//    * Get role by ID
//    */
//   getRole(roleId: number): Role | undefined {
//     return this.roles.get(roleId);
//   }
// }

// Export singleton instance
// export const permissionManager = new PermissionManager();
