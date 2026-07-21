import { SchoolRecord, MarketingStatus } from '../types';

export const RAW_SCHOOLS: { no: number; name: string }[] = [];

export const SPECIAL_DATA: Record<number, Partial<SchoolRecord>> = {};

export function getInitialSchools(): SchoolRecord[] {
  return [];
}
