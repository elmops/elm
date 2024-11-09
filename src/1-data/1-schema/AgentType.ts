export interface Agent {
  id: string;
  name?: string;
  roles: string[];
  speakingTimeQuota: number;
}
