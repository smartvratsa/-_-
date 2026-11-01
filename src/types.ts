export type IssueCategory =
  | 'Градско обзавеждане'
  | 'Чистота'
  | 'Зелени площи'
  | 'Пътища и тротоари'
  | 'Осветление'
  | 'ВиК'
  | 'Детски площадки'
  | 'Графити'
  | 'Животни'
  | 'Друго';

export type IssuePriority = 'нисък' | 'нормален' | 'висок' | 'спешен';

export type ResolutionPath = 'blue' | 'yellow' | 'red';

export type ConfidenceLevel = 'висока' | 'средна' | 'ниска';

export interface ActionPlan {
  people: number;
  time: string;
  materials: string[];
  tools: string[];
  steps: string[];
}

export interface AnalysisResult {
  category: IssueCategory | string;
  problem: string;
  priority: IssuePriority;
  path: ResolutionPath;
  path_reason: string;
  needs_approval: boolean;
  urgencyScore: number; // 1-100 calculated by AI
  urgencyRationale?: string;
  plan: ActionPlan;
  safety_warning: string;
  contains_personal_data: boolean;
  confidence: ConfidenceLevel;
  clarifying_question: string;
  based_on_cases: string[];
  notes: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SolvedCase {
  id: string;
  code: string; // e.g. "#VRZ-012"
  title: string;
  category: IssueCategory;
  path: ResolutionPath;
  location: string;
  dateCompleted: string;
  summary: string;
  planApplied: {
    people: number;
    time: string;
    materials: string[];
    tools: string[];
    steps: string[];
  };
  outcome: string;
}

export interface ResolutionVerification {
  verified: boolean;
  difficultyRating: number; // 1 to 5
  difficultyName: string; // 'Лесна' | 'Средна' | 'Сложна' | 'Експертна'
  speedBonusPercent: number; // e.g. 25
  speedRatingName: string; // 'Светкавично' | 'Много бързо' | 'Стандартно'
  basePoints: number;
  totalPointsAwarded: number;
  feedback: string;
  verifiedAt: string;
  timeSpentHours: number;
}

export interface ReportItem {
  id: string;
  ticketNumber: string; // e.g. "СИГ-VRZ-2026-402"
  title: string;
  description: string;
  location: string;
  neighborhood: string;
  coordinates: Coordinates;
  imageUrl: string;
  createdAt: string;
  analysis: AnalysisResult;
  status: 'нови' | 'прегледан' | 'одобрен' | 'в_изпълнение' | 'решен';
  volunteersCount: number;
  volunteers: string[];
  blurPersonalData: boolean;
  municipalNotes?: string;
  assignedDepartment?: string;
  // Resolution details
  resolvedImageUrl?: string;
  resolvedAt?: string;
  resolvedByVolunteer?: string;
  resolutionVerification?: ResolutionVerification;
  historyLog: {
    timestamp: string;
    actor: string;
    action: string;
    badge?: string;
  }[];
}

export type VolunteerRank =
  | 'Новак доброволец'
  | 'Квартален пазител'
  | 'Градски майстор'
  | 'Почетен гражданин'
  | 'Легенда на Враца';

export interface VolunteerProfile {
  id: string;
  name: string;
  emailOrPhone: string;
  gmail?: string;
  phone?: string;
  neighborhood: string;
  joinedDate: string;
  weeklyPoints: number;
  totalPoints: number;
  resolvedTasksCount: number;
  activeAssignments: string[]; // report ids
  rank: VolunteerRank;
  skills?: string;
  preferredCategories?: string[];
  availability?: string;
  photoURL?: string;
  linkedProviders?: string[]; // e.g. ['google.com', 'facebook.com', 'phone', 'password']
  facebookId?: string;
  googleEmail?: string;
  authProvider?: string;
  badges: {
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedDate?: string;
  }[];
}

export interface LeaderboardUser {
  id: string;
  name: string;
  neighborhood: string;
  avatarSeed: string;
  rank: VolunteerRank;
  weeklyPoints: number;
  totalPoints: number;
  tasksResolvedThisWeek: number;
  avgResolutionTimeHours: number;
  badgesCount: number;
  featuredBadge: string;
  isCurrentUser?: boolean;
}
