export interface SurveyedSchool {
  name: string;
  instagram?: string;
  tiktok?: string;
}

export const SURVEYED_DATABASE: Record<string, Record<string, SurveyedSchool[]>> = {};

