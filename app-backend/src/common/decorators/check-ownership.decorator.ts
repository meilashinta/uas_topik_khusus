import { SetMetadata } from '@nestjs/common';

export interface OwnershipMetadata {
  paramName: string; 
  field: string;
}

export const CHECK_OWNERSHIP_KEY = 'checkOwnership';
export const CheckOwnership = (paramName: string = 'id', field: string = 'createdById') => 
  SetMetadata(CHECK_OWNERSHIP_KEY, { paramName, field });
