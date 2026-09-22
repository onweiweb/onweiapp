export interface CreateStaffUserInput {
  email: string;
  name: string;
  initialPassword: string;
}

export interface UpdateStaffUserInput {
  name?: string;
  isActive?: boolean;
  resetPassword?: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
}

export type UpdateRoleInput = Partial<CreateRoleInput>;
