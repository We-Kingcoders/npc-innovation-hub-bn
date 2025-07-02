import { Optional } from "sequelize";

export interface MemberAttributes {
  id?: string;
  userId?: string;
  membershipLevel?: string;
  company?: string;
  position?: string;
  industry?: string;
  bio?: string;
  skills?: string[];
  website?: string;
  linkedIn?: string;
  github?: string;
  memberSince?: Date;
  membershipExpiry?: Date;
  lastActive?: Date;
  contributionScore?: number;
  innovationPoints?: number;
  projectsCompleted?: number;
  eventsAttended?: number;
  mentorId?: string;
  isMentor?: boolean;
  specializations?: string[];
  availabilityHours?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemberSignupAttributes
  extends Optional<
    MemberAttributes,
    | "id"
    | "membershipLevel"
    | "company"
    | "position"
    | "industry"
    | "bio"
    | "skills"
    | "website"
    | "linkedIn"
    | "github"
    | "memberSince"
    | "membershipExpiry"
    | "lastActive"
    | "contributionScore"
    | "innovationPoints"
    | "projectsCompleted"
    | "eventsAttended"
    | "mentorId"
    | "isMentor"
    | "specializations"
    | "availabilityHours"
    | "createdAt"
    | "updatedAt"
  > {}

export interface MemberOutputs extends Required<MemberAttributes> {}