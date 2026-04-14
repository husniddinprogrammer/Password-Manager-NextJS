export interface UserInfo {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  role: string;
}

export interface User {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  role: string;
  createdAt: Date;
}

export interface Credential {
  id: string;
  userId: string;
  name: string;
  url?: string | null;
  username: string;
  password: string;
  passwordHash?: string | null;
  notes?: string | null;
  category: string;
  tags: string[];
  scope: string;
  teamId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedCredential extends Omit<Credential, 'username' | 'password' | 'notes'> {
  username: string;
  password: string;
  notes: string | null;
  isReused?: boolean;
  teamName?: string | null;
  canEdit?: boolean;
  strength?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  credentialId?: string | null;
  credName?: string | null;
  timestamp: Date;
}

export type ActivityAction =
  | 'CREDENTIAL_CREATED'
  | 'CREDENTIAL_UPDATED'
  | 'CREDENTIAL_DELETED'
  | 'CREDENTIAL_VIEWED'
  | 'PASSWORD_COPIED'
  | 'USERNAME_COPIED'
  | 'VAULT_UNLOCKED'
  | 'VAULT_LOCKED'
  | 'MASTER_PASSWORD_CHANGED'
  | 'VAULT_EXPORTED'
  | 'VAULT_IMPORTED';

export type CredentialCategory =
  | 'General'
  | 'Social'
  | 'Banking'
  | 'Email'
  | 'Work'
  | 'Shopping'
  | 'Development'
  | 'Entertainment'
  | 'Other';

export const CREDENTIAL_CATEGORIES: CredentialCategory[] = [
  'General',
  'Social',
  'Banking',
  'Email',
  'Work',
  'Shopping',
  'Development',
  'Entertainment',
  'Other',
];

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CredentialFormData {
  name: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  category: string;
  tags: string[];
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  ownerId: string;
  _count?: { members: number; credentials: number };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: Date;
  user?: Pick<UserInfo, 'id' | 'username' | 'displayName' | 'email'>;
}
