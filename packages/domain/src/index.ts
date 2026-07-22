export { type Brand, type UserId, type Email, userId, email, isUserId } from './brand.js';
export {
  appRoleSchema,
  userSchema,
  adminSessionSchema,
  type AppRole,
  type User,
  type AdminSession,
} from './user/schema.js';
export {
  canAccessAdmin,
  assertAdminAccess,
  type AdminAccessDeniedReason,
  type AdminAccessResult,
} from './user/rules.js';
export {
  signupRoleSchema,
  appSessionSchema,
  signUpResultSchema,
  signUpInputSchema,
  appSignInInputSchema,
  type SignupRole,
  type AppSession,
  type SignUpResult,
  type SignUpInput,
  type AppSignInInput,
} from './auth/schema.js';
export { isAuthenticatedSession } from './auth/rules.js';
export {
  coachContextSchema,
  profileSchema,
  coachProfileInputSchema,
  playerProfileInputSchema,
  teamManagerProfileInputSchema,
  type CoachContext,
  type Profile,
  type CoachProfileInput,
  type PlayerProfileInput,
  type TeamManagerProfileInput,
} from './profile/schema.js';
export { isProfileComplete } from './profile/rules.js';
export {
  COACH_ONBOARDING_COMPLETED_EVENT,
  COACH_ONBOARDING_STEP_COUNT,
  PLAYER_ONBOARDING_COMPLETED_EVENT,
  PLAYER_ONBOARDING_STEP_COUNT,
  needsCoachOnboarding,
  needsPlayerOnboarding,
} from './onboarding/rules.js';
export {
  subscriptionTierSchema,
  subscriptionStatusSchema,
  subscriptionSchema,
  billingInvoiceStatusSchema,
  billingInvoiceSchema,
  type SubscriptionTier,
  type SubscriptionStatus,
  type Subscription,
  type BillingInvoiceStatus,
  type BillingInvoice,
} from './subscription/schema.js';
export {
  TRIAL_DURATION_DAYS,
  needsSubscriptionGate,
  trialGrantsProAccess,
  effectiveTierForAccess,
  legacyDisplayTier,
  trialDaysRemaining,
} from './subscription/rules.js';
export {
  DEFAULT_TRIAL_WARNING_DAYS_BEFORE,
  TRIAL_WARNING_SETTING_KEY,
  canActivateTrial,
  normalizeTrialWarningDays,
  shouldSendTrialExpiryWarning,
} from './subscription/trial.js';
export {
  ADVANCED_OR_PRO_FEATURES,
  isTrialExpired,
  expiredTrialDowngrade,
  applyExpiredTrialDowngrade,
  needsTrialExpiredUpgradePrompt,
  retainsPurchasedMarketplaceContent,
  meetsTierMinimum,
  isAdvancedOrProFeatureLocked,
  selectTrialsToExpire,
  type AdvancedOrProFeature,
  type ExpiredTrialDowngrade,
  type TrialExpiryCandidate,
} from './subscription/expiry.js';
export {
  STRIPE_PRODUCT_CATALOG,
  paidSubscriptionTierSchema,
  getStripeCatalogEntry,
  resolveTierFromStripePriceMetadata,
  isPaidSubscriptionTier,
  type PaidSubscriptionTier,
  type StripeProductCatalogEntry,
} from './subscription/catalog.js';
export {
  isSubscriptionPaymentLocked,
  canViewBillingHistory,
  lockedStateMessage,
} from './subscription/billing.js';
export {
  HISTORY_RETAINED_FEATURES,
  classifyTierChange,
  applyImmediateUpgrade,
  scheduleDowngradeAtPeriodEnd,
  pendingTierChange,
  accountPlanOverview,
  accountUsageSummary,
  downgradeHistoryRetention,
  isHistoryFeatureVisible,
  downgradeRetentionNotice,
  type TierChangeKind,
  type ImmediateUpgrade,
  type ScheduledDowngrade,
  type PendingTierChange,
  type AccountPlanOverview,
  type AccountUsageItem,
  type DowngradeHistoryRetention,
  type HistoryRetainedFeature,
} from './subscription/tier-change.js';
export {
  FEATURE_TIER_REQUIREMENTS,
  GATED_FEATURE_KEYS,
  requiredTierForFeature,
  resolvedTierForFeatureRole,
  gatedFeaturesForRole,
  formatFeatureLabel,
  applyFeatureFlagOverrides,
  isFreeAtBasicTier,
  tierDisplayLabel,
  unlockedFeaturesForTier,
  paywallCopyForFeature,
  paywallTierOptionsForFeature,
  paywallRequirementPhrase,
  hasHigherPaidTier,
  shouldShowPaywallTrialCta,
  buildCheckoutSessionRequest,
  type PaywallRole,
  type GatedRole,
  type FeatureTierRequirements,
  type FeatureFlagOverride,
  type FreeContentCatalogItem,
  type PaywallEncounterCopy,
  type PaywallTierOption,
  type CheckoutSessionRequest,
} from './subscription/paywall.js';
export {
  normalizeRbacRole,
  checkFeatureAccess,
  canAccessFeature,
  featureAccessDenial,
  upgradeHintForFeature,
  type RbacRole,
  type FeatureAccessDecision,
  type FeatureAccessDenialReason,
  type FeatureAccessInput,
  type FeatureAccessDenial,
} from './rbac/policy.js';
export {
  FULL_MATRIX_DEFERRED,
  LAUNCH_ACCESS_BANDS,
  LAUNCH_CRITICAL_FEATURE_KEYS,
  countLaunchCriticalRules,
  resolveLaunchFeatureAccess,
  featureAccessLevel,
  canAccessFeatureFully,
  canAccessFeatureReadonlyOrFull,
  launchBandFor,
  type LaunchAccessBand,
  type LaunchAccessLevel,
  type ResolvedFeatureAccess,
} from './rbac/launch-matrix.js';
export {
  teamSchema,
  teamProfileInputSchema,
  rosterMemberSchema,
  teamInviteSchema,
  teamInviteWithLinkSchema,
  teamInvitePreviewSchema,
  rosterRoleSchema,
  rosterStatusSchema,
  inviteStatusSchema,
  type Team,
  type TeamProfileInput,
  type RosterMember,
  type RosterRole,
  type RosterStatus,
  type TeamInvite,
  type TeamInviteWithLink,
  type TeamInvitePreview,
  type InviteStatus,
} from './team/schema.js';
export { needsTeamManagerTeamSetup, canManageTeamAgeRange, formatTeamAgeRange, formatTeamProfileSummary } from './team/rules.js';
export {
  canAssignCoachToTeam,
  canGenerateTeamInvite,
  canManageFullRoster,
  canManuallyAddRosterPlayer,
  canRemoveRosterPlayer,
} from './team/access.js';
export {
  sessionSchema,
  sessionInputSchema,
  sessionStatusSchema,
  sessionTypeSchema,
  type Session,
  type SessionInput,
} from './session/schema.js';
export {
  sessionContentKindSchema,
  sessionContentSourceSchema,
  sessionContentRefSchema,
  sessionContentRefsSchema,
  normalizeContentRefs,
  attachContentRef,
  type SessionContentKind,
  type SessionContentSource,
  type SessionContentRef,
} from './session/content-refs.js';
export {
  canCreateSession,
  canCreateTeamSession,
  canCreateIndividualSession,
  canEditSession,
  canViewSharedSchedule,
} from './session/access.js';
export {
  canAccessSessionContent,
  sessionContentAccessMessage,
} from './session/content-access.js';
export {
  sessionContentKey,
  drillLogInputSchema,
  type DrillLogInput,
  type SessionContentCompletion,
} from './session/completion.js';
export {
  BASIC_TIER_PROGRESS_SCOPE,
  computeCompletionPercent,
  summarizePlayerProgress,
  playerProgressFeaturesForAccess,
  progressScopeLabel,
  type PlayerProgressSummary,
  type PlayerProgressFeatures,
} from './session/progress.js';
export {
  coachProgressFeaturesForAccess,
  filterCoachCompletions,
  parseSessionContentKey,
  formatCompletionLabel,
  buildCorrectiveSessionInput,
  type CoachProgressFeatures,
  type CoachCompletionFilters,
} from './session/coach-progress.js';
export {
  DEFAULT_SESSION_REMINDER_HOURS_BEFORE,
  SESSION_REMINDER_SETTING_KEY,
  normalizeSessionReminderHours,
  shouldSendSessionReminder,
  filterUpcomingSessions,
} from './session/reminders.js';
export {
  SESSION_MVP_TYPES,
} from './session/types.js';
export {
  mapSessionValidationMessage,
  formatSessionValidationError,
  looksLikeZodIssueDump,
} from './session/messages.js';
export {
  coachCreatableKindSchema,
  coachLibraryTranscodeStatusSchema,
  createCoachLibraryItemInputSchema,
  createCoachPackageInputSchema,
  coachLibraryItemSchema,
  normalizePackageItemIds,
  buildSessionPrefillFromLibraryItem,
  type CoachCreatableKind,
  type CoachLibraryTranscodeStatus,
  type CreateCoachLibraryItemInput,
  type CreateCoachPackageInput,
  type CoachLibraryItemModel,
} from './content/schema.js';
export { mapContentError } from './content/messages.js';
export {
  ALLOW_NON_ROSTER_CONTENT_DISTRIBUTION,
  contentRecipientModeSchema,
  assignContentInputSchema,
  canDistributeToNonRosterPlayer,
  assertPlayerOnRosterForDistribution,
  type ContentRecipientMode,
  type AssignContentInput,
} from './content/distribution.js';
export {
  COACH_VIDEO_MAX_BYTES,
  assertCoachVideoWithinPolicy,
  buildMuxHlsUrl,
  isHlsUrl,
  type CoachVideoFileLike,
} from './content/video-policy.js';
export {
  INVITE_EXPIRY_DAYS,
  allowsMultipleTeamMembership,
  generateInviteCode,
  normalizeInviteCode,
  buildInviteLink,
  validateTeamInvite,
  mapInviteErrorMessage,
  type InviteValidationError,
} from './team/invite-rules.js';
export {
  CHAT_CHANNEL_TYPES,
  isChatChannelType,
  sortMemberPair,
  computeUnreadCount,
  conversationTypeLabel,
  type ChatChannelType,
} from './chat/channel.js';
export {
  MVP_CHAT_MESSAGE_TYPES,
  DISABLED_CHAT_MESSAGE_TYPES,
  DISABLED_CHAT_MESSAGE_TOOLTIPS,
  chatContentLinkAttachmentSchema,
  chatVideoAttachmentSchema,
  isMvpChatMessageType,
  isDisabledChatMessageType,
  disabledChatMessageTooltip,
  canSendTextOnChannelType,
  previewBodyForMessage,
  buildContentLinkAttachment,
  isContentLinkAttachment,
  isVideoAttachment,
  type MvpChatMessageType,
  type DisabledChatMessageType,
  type ChatContentLinkAttachment,
  type ChatVideoAttachment,
  type ChatMessageAttachment,
} from './chat/message.js';
export {
  PEER_SHARE_MESSAGE_TYPES,
  chatAchievementAttachmentSchema,
  chatInsightAttachmentSchema,
  canSharePeerKnowledge,
  canSharePeerContentToChannel,
  canViewPeerEngagement,
  isPeerShareMessageType,
  buildAchievementAttachment,
  buildInsightAttachment,
  achievementFromProgress,
  formatInsightShareMessage,
  isAchievementAttachment,
  isInsightAttachment,
  summarizePeerEngagement,
  type PeerShareMessageType,
  type ChatAchievementAttachment,
  type ChatInsightAttachment,
  type ChatPeerShareAttachment,
  type PeerShareEngagementInput,
  type PeerEngagementSummary,
} from './chat/peer-share.js';
