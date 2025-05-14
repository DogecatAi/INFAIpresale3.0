export const PRESALE_ADDRESS: string;
export const DOGECAT_TOKEN_ADDRESS: string;

export interface PresaleConfig {
  rate: number;
  taxRate: number;
  minContribution: number;
  maxContribution: number;
  hardCap: number;
  softCap: number;
}

export const PRESALE_CONFIG: PresaleConfig;
