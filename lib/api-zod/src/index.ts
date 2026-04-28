// Schemas (zod values, used by server handlers for response validation).
export * from "./generated/api";

// Hand-maintained schemas for endpoints not yet wired into the OpenAPI spec.
import * as zod from "zod";
export const CaptureProjectScreenshotResponse = zod.object({
  screenshotUrl: zod.string().nullable(),
});

// Inferred TypeScript types (used by frontend for type-safe response shapes).
// Three names collide with zod schemas exported above
// (`UpdateMeBody`, `DeleteProjectFileResponse`, `UploadProjectFileBody`):
// the schema lives in value space and is what the server uses for `.parse()`,
// so we skip the type re-export here. Consumers that want the inferred TS
// type for one of these can write `z.infer<typeof Schema>`.
export type {
  AddDomainBody,
  AdminCostByModel,
  AdminMe,
  AdminRecentBuild,
  AdminStats,
  AdminTemplateItem,
  AdminUser,
  AppConfig,
  Build,
  CreateBuildBody,
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectFileResponseStatus,
  Deployment,
  DeploymentStatus,
  DnsRecordType,
  DomainDnsMismatch,
  AdminPayout,
  AdminPayoutStatus,
  CreateOnboardingLinkBody,
  Earning,
  EarningsSummary,
  MyPayout,
  MyPayoutStatus,
  MyPayoutAccount,
  MyPayoutAccountStatus,
  PayoutCycleResult,
  PayoutOnboardingLink,
  PayoutSettings,
  UpdatePayoutSettingsBody,
  RetryPayoutResponse,
  UpdateUserCommissionBody,
  DomainSuggestedRecord,
  DomainVerificationRecord,
  ExploreItem,
  ExploreParams,
  FileEncoding,
  HealthStatus,
  Me,
  Project,
  ProjectDomain,
  ProjectFile,
  ProjectFileContent,
  ProjectListItem,
  ProjectOwner,
  PublishResponse,
  PublishStatus,
  ReferralSourceBreakdown,
  ReferredUser,
  MyReferrals,
  RenameProjectBody,
  SetPrimaryDomainResponse,
  TemplateItem,
  Transaction,
  User,
} from "./generated/types";
