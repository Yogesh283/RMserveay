export type QuestionType =
  | 'multiple_choice'
  | 'text'
  | 'rating'
  | 'yes_no'
  | 'dropdown';

export interface QuestionLogic {
  whenQuestionKey?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty';
  value: unknown;
  showQuestionKeys: string[];
  hideQuestionKeys: string[];
}

export interface SurveyQuestion {
  key: string;
  type: QuestionType;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
  minRating?: number;
  maxRating?: number;
  order?: number;
  logic?: QuestionLogic;
}

export interface TargetAudience {
  ageMin?: number | null;
  ageMax?: number | null;
  genders?: string[];
  locations?: string[];
}

export interface Survey {
  id?: string | number;
  _id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'inactive';
  questions: SurveyQuestion[];
  targetAudience?: TargetAudience;
  responseCount?: number;
  earningsTotalUsd?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  balanceUsd?: number;
  wallet?: { id: number; balance: number; currency: string };
  paymentDetails?: {
    upi?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
  };
  notificationPrefs?: {
    email?: boolean;
    push?: boolean;
    earnings?: boolean;
    surveyComplete?: boolean;
  };
}
