import './index.css';
import { useState, useEffect, useCallback } from "react";
import { AuthGate } from "./features/auth/ui/AuthGate.jsx";
import { ProfileGate } from "./features/profile/ui/ProfileGate.jsx";
import { SubscriptionGate } from "./features/subscription/ui/SubscriptionGate.jsx";
import { CoachOnboardingGate } from "./features/onboarding/ui/CoachOnboardingGate.jsx";
import { PlayerOnboardingGate } from "./features/onboarding/ui/PlayerOnboardingGate.jsx";
import { TeamManagerTeamGate } from "./features/team/ui/TeamManagerTeamGate.jsx";
import { RosterScreen } from "./features/roster/ui/RosterScreen.jsx";
import { ScheduleScreen } from "./features/schedule/ui/ScheduleScreen.jsx";
import { PlayerTeamContext } from "./features/roster/ui/PlayerTeamContext.jsx";
import { PlayerJoinTeamScreen } from "./features/roster/ui/PlayerJoinTeamScreen.jsx";
import { ProfileScreen } from "./features/profile/ui/ProfileScreen.jsx";
import { ProgressScreen } from "./features/progress/ui/ProgressScreen.jsx";
import { CoachProgressReviewScreen } from "./features/progress/ui/CoachProgressReviewScreen.jsx";
import { ChatScreen } from "./features/chat/ui/ChatScreen.jsx";
import { CreateContentScreen } from "./features/content/ui/CreateContentScreen.jsx";
import { CoachLibraryScreen } from "./features/content/ui/CoachLibraryScreen.jsx";
import { DistributeContentScreen } from "./features/content/ui/DistributeContentScreen.jsx";
import { PlayerContentScreen } from "./features/content/ui/PlayerContentScreen.jsx";
import { StoreScreen } from "./features/marketplace/ui/StoreScreen.jsx";
import { SubscriptionScreen } from "./features/subscription/ui/SubscriptionScreen.jsx";
import { TrialBanner } from "./features/subscription/ui/TrialBanner.jsx";
import { PaywallModal } from "./features/subscription/ui/PaywallModal.jsx";
import { useOnboardingNavigation } from "./features/onboarding/model/onboarding-navigation-context.jsx";
import { useSubscription } from "./features/subscription/model/subscription-context.jsx";
import { useAuth } from "./features/auth/model/use-auth.js";
import { mapAppUserToLegacy } from "./features/auth/lib/map-app-user.js";
import { useRepositories } from "@coach360/api";
import {
  applyFeatureFlagOverrides,
  checkFeatureAccess,
  featureAccessLevel,
  filterUpcomingSessions,
  paywallTierOptionsForFeature,
  playerProgressFeaturesForAccess,
  summarizePlayerProgress,
} from "@coach360/domain";
import {
  AppShell,
  Badge,
  Button as Btn,
  Card,
  DashedBtn,
  PageHeader,
  ScreenContainer,
  TabBar,
} from "./shared/ui/primitives.jsx";
import {
  bgAccentClass as bgcx,
  textAccentClass as tcx,
} from "./shared/ui/accent.js";

const COLORS = {
  bg: "#0B0E14",
  surface: "#141821",
  card: "#1A1F2B",
  border: "#2A3040",
  orange: "#FF6B2C",
  orangeGlow: "rgba(255,107,44,0.15)",
  orangeLight: "#FF8F5E",
  green: "#34D399",
  blue: "#60A5FA",
  purple: "#A78BFA",
  red: "#F87171",
  yellow: "#FBBF24",
  t1: "#F1F3F7",
  t2: "#8B93A7",
  t3: "#5A6278",
};


/* ── Access Control — centralized RBAC policy layer (STORY-5.1 / 5.2 / 5.4) ── */
/** Live merged requirements; null → static FEATURE_TIER_REQUIREMENTS fallback. */
var gatingState = { requirements: null, overrides: [] };

function setGatingState(next) {
  gatingState = {
    requirements: next.requirements ?? null,
    overrides: next.overrides || [],
  };
}

function canAccess(user, feature, requirements) {
  if (!user) return false;
  return checkFeatureAccess({
    role: user.role,
    tier: user.tier,
    feature,
    requirements: requirements !== undefined ? requirements : gatingState.requirements,
  }).allowed;
}

function accessLevel(user, feature, requirements) {
  if (!user) return "none";
  return featureAccessLevel(
    user.role,
    user.tier,
    feature,
    requirements !== undefined ? requirements : gatingState.requirements,
  );
}

/* ── Icons as functions ── */
function IconHome() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconUsers() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>; }
function IconCal() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconChat() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function IconStore() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>; }
function IconChev() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>; }
function IconLock() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>; }
function IconSpark() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L9 12l-7 1 5 5-1 6 6-3 6 3-1-6 5-5-7-1z"/></svg>; }
function IconTarget() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>; }
function IconChart() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconTrophy() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M4 22h16M18 2H6v7a6 6 0 0012 0V2z"/></svg>; }
function IconSettings() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }

/* ── Onboarding ── */
function OnboardingScreen({ user, onComplete }) {
  var _s = useState(0), step = _s[0], setStep = _s[1];
  var steps = user.role === "coach" ? ["Welcome!", "Set up your profile", "Browse training packages", "Plan your first session"] : user.role === "player" ? ["Welcome!", "Set up your profile", "Browse training content", "Start your first drill"] : ["Welcome!", "Platform overview", "Management tools"];
  var descs = {
    coach: [
      "Welcome to Coach360, " + user.name + "! Let's get you set up.",
      "Complete your profile. You can create or join a team later, or work independently.",
      "Explore training packages curated by Coach360.",
      "Create a session with drills and content. Share with individual players or a team."
    ],
    player: [
      "Welcome to Coach360, " + user.name + "!",
      "Complete your profile. You can join a team later via invite, or train independently.",
      "Browse and purchase training content from the marketplace.",
      "Complete drills to start tracking your progress."
    ],
    admin: [
      "Welcome, Admin!",
      "Here's an overview of your management dashboard.",
      "Manage users, subscriptions, content, and analytics."
    ]
  };
  var currentDescs = descs[user.role] || descs.admin;

  return (
    <div className="px-6 py-10 text-center">
      <div className="mb-8 flex justify-center gap-1.5">
        {steps.map(function(_, i) {
          return (
            <div
              key={i}
              className={`h-1 w-10 rounded-sm ${i <= step ? "bg-coach-orange" : "bg-coach-border"}`}
            />
          );
        })}
      </div>
      <div className="mb-3 font-display text-2xl font-bold text-coach-t1">{steps[step]}</div>
      <div className="mb-8 font-body text-sm leading-relaxed text-coach-t2">{currentDescs[step]}</div>
      <div className="flex gap-2.5">
        {step < steps.length - 1 ? (
          <>
            <Btn full onClick={onComplete}>Skip</Btn>
            <Btn primary full onClick={function() { setStep(step + 1); }}>Next</Btn>
          </>
        ) : (
          <Btn primary full onClick={onComplete}>{"Let's Go!"}</Btn>
        )}
      </div>
    </div>
  );
}

/* ── Home ── */
function HomeScreen({ user, go, tryA }) {
  var isPlayer = user.role === "player";
  var isAdmin = user.role === "admin";
  var isTeam = user.role === "team";

  var auth = useAuth();
  var repos = useRepositories();
  var playerId = auth.session?.user.id;
  var _upcoming = useState([]), upcomingSessions = _upcoming[0], setUpcomingSessions = _upcoming[1];
  var _completions = useState([]), completions = _completions[0], setCompletions = _completions[1];
  var _homeLoading = useState(false), homeLoading = _homeLoading[0], setHomeLoading = _homeLoading[1];

  var loadPlayerHomeData = useCallback(
    async function () {
      if (!isPlayer || !playerId) {
        setUpcomingSessions([]);
        setCompletions([]);
        return;
      }

      setHomeLoading(true);
      try {
        var _rows = await Promise.all([
          repos.sessions.listForUser(playerId),
          repos.sessionContent.listPlayerProgress(playerId),
        ]);
        setUpcomingSessions(_rows[0] ?? []);
        setCompletions(_rows[1] ?? []);
      } catch {
        setUpcomingSessions([]);
        setCompletions([]);
      } finally {
        setHomeLoading(false);
      }
    },
    [isPlayer, playerId, repos.sessionContent, repos.sessions],
  );

  useEffect(
    function () {
      loadPlayerHomeData();
    },
    [loadPlayerHomeData],
  );

  var homeAccessLevel = isPlayer
    ? featureAccessLevel(user.role, user.tier, "viewProgress")
    : "none";
  var homeProgressFeatures = playerProgressFeaturesForAccess(homeAccessLevel);
  var homeProgressSummary = summarizePlayerProgress(completions);
  var nextSession = filterUpcomingSessions(upcomingSessions)[0] ?? null;

  if (isAdmin) {
    return (
      <ScreenContainer>
        <PageHeader title="ADMIN" user={user} />
        {[{ l: "Users", v: "1,247", c: COLORS.blue, s: "admin-users" }, { l: "Revenue", v: "$34.8k", c: COLORS.green, s: "admin-subs" }, { l: "Content", v: "156 pkgs", c: COLORS.purple, s: "admin-content" }, { l: "Active", v: "89%", c: COLORS.orange, s: "admin-analytics" }].map(function(s, i) {
          return (
            <Card key={i} onClick={function() { go(s.s); }} className="flex items-center gap-3.5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgcx(s.c)} ${tcx(s.c)}`}><IconChart /></div>
              <div className="flex-1">
                <div className="font-body text-[13px] text-coach-t3">{s.l}</div>
                <div className="font-display text-[22px] font-bold text-coach-t1">{s.v}</div>
              </div>
              <IconChev />
            </Card>
          );
        })}
        <div className="h-6" />
      </ScreenContainer>
    );
  }

  var stats = isPlayer
    ? [{ l: "Drills", v: "24", c: COLORS.orange }, { l: "Streak", v: "7d", c: COLORS.green }, { l: "Goals", v: "3/5", c: COLORS.blue }, { l: "Rank", v: "#4", c: COLORS.purple }]
    : isTeam
    ? [{ l: "Players", v: "14", c: COLORS.blue }, { l: "Record", v: "10-1", c: COLORS.green }, { l: "Sessions", v: "32", c: COLORS.purple }, { l: "Next", v: "Thu", c: COLORS.orange }]
    : [{ l: "Players", v: "34", c: COLORS.blue }, { l: "Teams", v: "4", c: COLORS.green }, { l: "Sessions", v: "128", c: COLORS.purple }, { l: "Drills", v: "57", c: COLORS.orange }];

  return (
    <ScreenContainer>
      <PageHeader
        title={isPlayer ? user.name : isTeam ? user.name + " (Team)" : "Coach " + user.name}
        user={user}
        subtitle="Welcome back"
        trailing={
          <button
            type="button"
            onClick={function () { go("profile"); }}
            className="cursor-pointer border-none bg-transparent p-0 text-coach-t2"
          >
            <IconSettings />
          </button>
        }
      />
      <TrialBanner user={user} onUpgrade={function () { go("subscription"); }} />

      {isPlayer ? (
        <PlayerTeamContext onJoinTeam={function () { go("join-team"); }} />
      ) : null}

      <div className="grid grid-cols-4 gap-2.5 py-3">
        {stats.map(function(s, i) {
          return (
            <div key={i} className="rounded-[14px] border border-coach-border bg-coach-card px-2 py-3.5 text-center">
              <div className={`font-display text-[22px] font-bold ${tcx(s.c)}`}>{s.v}</div>
              <div className="mt-1 font-body text-[10px] uppercase text-coach-t3">{s.l}</div>
            </div>
          );
        })}
      </div>

      {!isPlayer && !isTeam && (
        <Card
          onClick={function () { go("progress"); }}
          className="mb-3 border border-coach-orange/20 bg-coach-orange-glow/40"
          data-testid="coach-home-player-progress"
        >
          <div className="font-body text-[13px] font-semibold text-coach-t1">Player progress</div>
          <div className="font-body text-xs text-coach-t2">Review drill completions and send feedback</div>
        </Card>
      )}

      {isPlayer && homeAccessLevel !== "none" ? (
        <Card
          onClick={function () { go("progress"); }}
          className="mb-3"
          data-testid="home-progress-summary"
        >
          <div className="mb-1 font-body text-xs uppercase text-coach-t3">Your progress</div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold text-coach-t1" data-testid="home-drills-completed">
              {homeProgressSummary.drillsCompleted} drills
            </span>
            {homeProgressFeatures.canViewFullDashboard ? (
              <span className="font-mono text-sm text-coach-orange">
                {homeProgressSummary.totalDurationMinutes}m practiced
              </span>
            ) : null}
          </div>
          {homeAccessLevel === "readonly" ? (
            <p className="mt-2 font-body text-xs text-coach-t3">
              Basic tier — upgrade to Pro for the full dashboard.
            </p>
          ) : null}
        </Card>
      ) : null}

      {canAccess(user, "ai") ? (
        <div className="py-2">
          <Card>
            <div className="mb-2.5 flex items-center gap-2">
              <div className="text-coach-orange"><IconSpark /></div>
              <span className="font-display text-[13px] font-semibold uppercase tracking-widest text-coach-orange">AI Insights</span>
            </div>
            <div className="font-body text-[13px] text-coach-t2">{isPlayer ? "Your shooting accuracy improved 12% this week." : "3 players in U14 haven't logged drills this week."}</div>
          </Card>
        </div>
      ) : (
        <div className="py-2">
          <Card onClick={function() { tryA("ai", function() {}); }} className="flex items-center gap-3">
            <div className="text-coach-t3"><IconLock /></div>
            <div>
              <div className="font-body text-[13px] font-semibold text-coach-t2">AI Insights</div>
              <div className="font-body text-[11px] text-coach-t3">Upgrade to Pro to unlock</div>
            </div>
          </Card>
        </div>
      )}

      <div className="py-3" data-testid="home-schedule-summary">
        <div className="mb-2.5 flex justify-between">
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-coach-t1">Upcoming</span>
          <span onClick={function() { go("schedule"); }} className="cursor-pointer font-body text-xs text-coach-orange">View all</span>
        </div>
        {isPlayer ? (
          homeLoading ? (
            <p className="font-body text-sm text-coach-t2">Loading schedule…</p>
          ) : nextSession ? (
            <Card className="flex items-center gap-3.5" data-testid="home-next-session">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-coach-orange-glow text-coach-orange"><IconTarget /></div>
              <div>
                <div className="font-body text-sm font-semibold text-coach-t1">{nextSession.title}</div>
                <div className="font-body text-xs text-coach-t3">
                  {(nextSession.playerId ? "Individual" : "Team") + " - " + new Date(nextSession.scheduledAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </Card>
          ) : (
            <p className="font-body text-sm text-coach-t2" data-testid="home-no-upcoming-sessions">No upcoming sessions yet.</p>
          )
        ) : (
          [{ t: "Shooting Drills", tm: isTeam ? "Full roster" : "U14 Eagles", ti: "Today, 4:00 PM" }, { t: "Game Film Review", tm: "Individual session", ti: "Tomorrow, 10 AM" }].map(function(s, i) {
            return (
              <Card key={i} className="flex items-center gap-3.5">
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-coach-orange-glow text-coach-orange"><IconTarget /></div>
                <div>
                  <div className="font-body text-sm font-semibold text-coach-t1">{s.t}</div>
                  <div className="font-body text-xs text-coach-t3">{s.tm + " - " + s.ti}</div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <div className="py-1">
        <div className="mb-2.5 flex justify-between">
          <span className="font-display text-sm font-semibold uppercase text-coach-t1">Objectives</span>
          <span onClick={function() { tryA("objectives", function() { go("objectives"); }); }} className="cursor-pointer font-body text-xs text-coach-orange">{canAccess(user, "objectives") ? "Manage" : "Pro"}</span>
        </div>
        {canAccess(user, "objectives") ? (
          [{ n: "Improve 3PT %", p: 72, c: COLORS.orange }, { n: "Defensive rotations", p: 45, c: COLORS.blue }].map(function(o, i) {
            return (
              <Card key={i}>
                <div className="mb-2 flex justify-between">
                  <span className="font-body text-[13px] text-coach-t1">{o.n}</span>
                  <span className={`font-mono text-[13px] ${tcx(o.c)}`}>{o.p + "%"}</span>
                </div>
                <div className="h-1.5 rounded-sm bg-coach-border">
                  <div className="h-full rounded-sm" style={{ width: o.p + "%", backgroundColor: o.c }} />
                </div>
              </Card>
            );
          })
        ) : (
          <Card onClick={function() { tryA("objectives", function() {}); }} className="p-6 text-center">
            <div className="mb-2 text-coach-t3"><IconLock /></div>
            <div className="font-body text-[13px] text-coach-t2">Upgrade to Pro for objectives</div>
          </Card>
        )}
      </div>

      {!isPlayer && !isTeam && canAccess(user, "createContent") && (
        <div className="py-3">
          <Btn primary full onClick={function() { go("create-content"); }}>+ Create Content</Btn>
        </div>
      )}
    </ScreenContainer>
  );
}


/* ── Objectives ── */
function ObjectivesScreen({ user, onBack }) {
  var objs = [{ n: "Improve 3PT to 40%", p: 72, pl: "Jaylen Carter" }, { n: "Defensive rotations", p: 45, pl: "Team U14" }, { n: "Free throw 85%+", p: 88, pl: "Deon Williams" }];
  function progressColor(p) {
    if (p >= 80) return COLORS.green;
    if (p >= 50) return COLORS.yellow;
    return COLORS.orange;
  }
  return (
    <ScreenContainer>
      <PageHeader title="OBJECTIVES" onBack={onBack} />
      {objs.map(function(o, i) {
        const barColor = progressColor(o.p);
        return (
          <Card key={i}>
            <div className="mb-1 flex justify-between">
              <span className="font-body text-sm font-semibold text-coach-t1">{o.n}</span>
              <span className={`font-mono text-sm ${tcx(barColor)}`}>{o.p + "%"}</span>
            </div>
            {user.role === "coach" && <div className="mb-2 font-body text-[11px] text-coach-t3">{o.pl}</div>}
            <div className="h-1.5 rounded-sm bg-coach-border">
              <div className="h-full rounded-sm" style={{ width: o.p + "%", backgroundColor: barColor }} />
            </div>
          </Card>
        );
      })}
      {user.role === "coach" && <DashedBtn>+ Add Objective</DashedBtn>}
    </ScreenContainer>
  );
}

/* ── Admin Detail ── */
function AdminDetailScreen({ screen, onBack }) {
  var titles = { "admin-users": "USERS", "admin-subs": "SUBSCRIPTIONS", "admin-content": "CONTENT", "admin-analytics": "ANALYTICS" };
  return (
    <ScreenContainer>
      <PageHeader title={titles[screen] || "ADMIN"} onBack={onBack} />
      {screen === "admin-users" && [{ n: "Coach Marcus", r: "Coach", t: "Pro", s: "Active" }, { n: "Jaylen Carter", r: "Player", t: "Advanced", s: "Active" }, { n: "Sarah Kim", r: "Coach", t: "Trial", s: "Trial" }].map(function(u, i) {
        return (
          <Card key={i} className="flex items-center gap-3">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-coach-orange-glow font-display text-sm font-bold text-coach-orange">{u.n[0]}</div>
            <div className="flex-1">
              <div className="font-body text-sm font-semibold text-coach-t1">{u.n}</div>
              <div className="font-body text-[11px] text-coach-t3">{u.r + " - " + u.t}</div>
            </div>
            <Badge color={u.s === "Trial" ? COLORS.yellow : COLORS.green}>{u.s}</Badge>
          </Card>
        );
      })}
      {screen === "admin-subs" && [{ l: "Trial", v: "234" }, { l: "Basic", v: "456" }, { l: "Advanced", v: "389" }, { l: "Pro", v: "168" }].map(function(s, i) {
        return (
          <Card key={i}>
            <div className="font-body text-xs text-coach-t3">{s.l}</div>
            <div className="mt-1 font-display text-[26px] font-bold text-coach-t1">{s.v}</div>
          </Card>
        );
      })}
      {screen === "admin-content" && [{ t: "Elite Shooting", s: "Published" }, { t: "Lockdown Defense", s: "Published" }, { t: "Rebounding Drills", s: "Review" }].map(function(c, i) {
        return (
          <Card key={i} className="flex items-center justify-between">
            <div className="font-body text-sm font-semibold text-coach-t1">{c.t}</div>
            <Badge color={c.s === "Review" ? COLORS.yellow : COLORS.green}>{c.s}</Badge>
          </Card>
        );
      })}
      {screen === "admin-analytics" && (
        <div className="grid grid-cols-2 gap-2.5">
          {[{ l: "DAU", v: "1,089" }, { l: "Avg session", v: "14 min" }, { l: "Drills/day", v: "3,456" }, { l: "Messages/day", v: "8,901" }].map(function(a, i) {
            return (
              <Card key={i} className="text-center">
                <div className="font-display text-2xl font-bold text-coach-orange">{a.v}</div>
                <div className="mt-1 font-body text-[11px] uppercase text-coach-t3">{a.l}</div>
              </Card>
            );
          })}
        </div>
      )}
    </ScreenContainer>
  );
}

/* ══════════ MAIN APP ══════════ */
function Coach360App({ pendingInviteCode, setPendingInviteCode }) {
  var auth = useAuth();
  var repos = useRepositories();
  var subscriptionState = useSubscription();
  var onboardingNav = useOnboardingNavigation();
  var session = auth.session;
  var user = session
    ? mapAppUserToLegacy(session.user, {
        isNew: auth.justRegistered,
        subscription: subscriptionState.subscription,
      })
    : null;
  var _s = useState("home"), screen = _s[0], setScreen = _s[1];
  var _o = useState(false), onboarding = _o[0], setOnboarding = _o[1];
  var _p = useState(null), paywall = _p[0], setPaywall = _p[1];
  var _paywallBusy = useState(false), paywallBusy = _paywallBusy[0], setPaywallBusy = _paywallBusy[1];
  var _paywallError = useState(null), paywallError = _paywallError[0], setPaywallError = _paywallError[1];
  var _billingHistory = useState([]), billingHistory = _billingHistory[0], setBillingHistory = _billingHistory[1];
  var _tierChangeBusy = useState(false), tierChangeBusy = _tierChangeBusy[0], setTierChangeBusy = _tierChangeBusy[1];
  var _tierChangeError = useState(null), tierChangeError = _tierChangeError[0], setTierChangeError = _tierChangeError[1];
  // STORY-5.4 — admin feature-tier overrides (merged over FEATURE_TIER_REQUIREMENTS).
  var _ff = useState([]), featureFlagOverrides = _ff[0], setFeatureFlagOverrides = _ff[1];
  var _pendingDm = useState(null), pendingChatDm = _pendingDm[0], setPendingChatDm = _pendingDm[1];
  var _schedulePrefill = useState(null), schedulePrefill = _schedulePrefill[0], setSchedulePrefill = _schedulePrefill[1];
  var _libraryHighlightId = useState(null), libraryHighlightId = _libraryHighlightId[0], setLibraryHighlightId = _libraryHighlightId[1];
  var _packageSeedId = useState(null), packageSeedId = _packageSeedId[0], setPackageSeedId = _packageSeedId[1];
  var _distributeItem = useState(null), distributeItem = _distributeItem[0], setDistributeItem = _distributeItem[1];
  var _fr = useState(null), featureRequirements = _fr[0], setFeatureRequirements = _fr[1];

  var refreshFeatureFlags = useCallback(function () {
    if (!session?.user?.id) {
      setFeatureFlagOverrides([]);
      setFeatureRequirements(null);
      setGatingState({ requirements: null, overrides: [] });
      return Promise.resolve();
    }
    return repos.content
      .listFeatureFlags()
      .then(function (overrides) {
        var merged = applyFeatureFlagOverrides(overrides);
        setFeatureFlagOverrides(overrides);
        setFeatureRequirements(merged);
        setGatingState({ requirements: merged, overrides: overrides });
      })
      .catch(function () {
        // Offline / unfetched: static FEATURE_TIER_REQUIREMENTS remains the fallback.
        setFeatureFlagOverrides([]);
        setFeatureRequirements(null);
        setGatingState({ requirements: null, overrides: [] });
      });
  }, [session?.user?.id, repos.content, setFeatureFlagOverrides, setFeatureRequirements]);

  useEffect(function () {
    // Session load — fetch merged feature-tier map (AC-1).
    refreshFeatureFlags();
  }, [refreshFeatureFlags]);

  useEffect(function() {
    // Coach/player use CoachOnboardingGate / PlayerOnboardingGate.
    // Team managers complete Create Team via TeamManagerTeamGate before subscription —
    // do not reopen the prototype Skip/Next OnboardingScreen stub.
    if (auth.justRegistered) {
      auth.clearJustRegistered();
    }
  }, [auth]);

  useEffect(function() {
    if (onboardingNav.redirectToSchedule) {
      setScreen("schedule");
      onboardingNav.clearRedirectToSchedule();
    }
  }, [onboardingNav, setScreen]);

  useEffect(function() {
    if (subscriptionState.redirectToSubscription) {
      setScreen("subscription");
      subscriptionState.clearRedirectToSubscription();
    }
  }, [subscriptionState, setScreen]);

  useEffect(function () {
    if (pendingInviteCode && user && user.role === "player") {
      setScreen("join-team");
    }
  }, [pendingInviteCode, user, setScreen]);

  // Account settings billing info (STORY-4.5 AC-1).
  var profileId = session?.user?.id;
  useEffect(function () {
    if (screen !== "subscription" || !profileId) {
      return;
    }
    var cancelled = false;
    repos.billing
      .listByProfileId(profileId)
      .then(function (invoices) {
        if (!cancelled) setBillingHistory(invoices);
      })
      .catch(function () {
        if (!cancelled) setBillingHistory([]);
      });
    return function () {
      cancelled = true;
    };
  }, [screen, profileId, repos.billing, setBillingHistory]);

  function go(s) { setScreen(s); }

  function clearPendingInvite() {
    setPendingInviteCode("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    setScreen("home");
  }

  function tryA(feature, action) {
    if (canAccess(user, feature, featureRequirements)) { action(); }
    else { setPaywallError(null); setPaywall(feature); }
  }

  function finishOnboarding() {
    setOnboarding(false);
    setScreen("home");
  }

  async function handleSignOut() {
    await auth.signOut();
    setScreen("home");
    setOnboarding(false);
  }

  async function handlePaywallUpgrade(tierId) {
    if (!user || !paywall || !session?.user?.id || !tierId) {
      return;
    }
    var plan = paywallTierOptionsForFeature(paywall, user.role, featureFlagOverrides);
    var selected = plan && plan.options.find(function (option) {
      return option.tier === tierId && option.selectable;
    });
    if (!selected) {
      setPaywallError("upgrade_tier_unavailable");
      return;
    }
    setPaywallBusy(true);
    setPaywallError(null);
    try {
      var subscription = subscriptionState.subscription;
      if (subscription && subscription.stripeSubscriptionId) {
        await repos.billing.changeSubscriptionTier({ tier: selected.tier });
        await subscriptionState.refreshSubscription();
        setPaywall(null);
      } else {
        var origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
        var result = await repos.billing.createCheckoutSession({
          tier: selected.tier,
          successUrl: origin + "/?checkout=success",
          cancelUrl: origin + "/?checkout=cancel",
        });
        setPaywall(null);
        if (typeof window !== "undefined" && result.url) {
          window.location.assign(result.url);
        }
      }
    } catch (cause) {
      setPaywallError(cause instanceof Error ? cause.message : "checkout_failed");
    } finally {
      setPaywallBusy(false);
    }
  }

  async function handlePaywallStartTrial() {
    if (!session?.user?.id) {
      return;
    }
    setPaywallBusy(true);
    setPaywallError(null);
    try {
      await repos.subscriptions.activateTrial(session.user.id);
      await subscriptionState.refreshSubscription();
      setPaywall(null);
    } catch (cause) {
      setPaywallError(cause instanceof Error ? cause.message : "trial_activation_failed");
    } finally {
      setPaywallBusy(false);
    }
  }

  // Flow 17 (STORY-4.5): immediate prorated upgrade / end-of-cycle downgrade.
  async function handleChangeSubscriptionTier(tierId) {
    if (!session?.user?.id || !tierId) {
      return;
    }
    setTierChangeBusy(true);
    setTierChangeError(null);
    try {
      var subscription = subscriptionState.subscription;
      if (subscription && subscription.stripeSubscriptionId) {
        await repos.billing.changeSubscriptionTier({ tier: tierId });
        await subscriptionState.refreshSubscription();
      } else {
        // No Stripe subscription yet (trial / deferred Basic) — start checkout.
        var origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
        var result = await repos.billing.createCheckoutSession({
          tier: tierId,
          successUrl: origin + "/?checkout=success",
          cancelUrl: origin + "/?checkout=cancel",
        });
        if (typeof window !== "undefined" && result.url) {
          window.location.assign(result.url);
        }
      }
    } catch (cause) {
      setTierChangeError(cause instanceof Error ? cause.message : "tier_change_failed");
    } finally {
      setTierChangeBusy(false);
    }
  }

  function handlePaywallDismiss() {
    setPaywall(null);
    setPaywallError(null);
  }

  function handlePaywallBrowseFree() {
    setPaywall(null);
    setPaywallError(null);
    setScreen("marketplace");
  }

  var tabs;
  if (user && user.role === "admin") {
    tabs = [{ id: "home", icon: <IconHome />, label: "Dashboard" }, { id: "admin-users", icon: <IconUsers />, label: "Users" }, { id: "admin-content", icon: <IconStore />, label: "Content" }, { id: "admin-analytics", icon: <IconChart />, label: "Analytics" }];
  } else if (user && user.role === "player") {
    tabs = [{ id: "home", icon: <IconHome />, label: "Home" }, { id: "progress", icon: <IconTrophy />, label: "Progress" }, { id: "schedule", icon: <IconCal />, label: "Schedule" }, { id: "chat", icon: <IconChat />, label: "Chat" }, { id: "marketplace", icon: <IconStore />, label: "Content" }];
  } else if (user && user.role === "team") {
    tabs = [{ id: "home", icon: <IconHome />, label: "Home" }, { id: "teams", icon: <IconUsers />, label: "Roster" }, { id: "schedule", icon: <IconCal />, label: "Schedule" }, { id: "chat", icon: <IconChat />, label: "Chat" }, { id: "marketplace", icon: <IconStore />, label: "Store" }];
  } else {
    tabs = [{ id: "home", icon: <IconHome />, label: "Home" }, { id: "teams", icon: <IconUsers />, label: "Roster" }, { id: "schedule", icon: <IconCal />, label: "Schedule" }, { id: "chat", icon: <IconChat />, label: "Chat" }, { id: "marketplace", icon: <IconStore />, label: "Store" }];
  }

  function renderScreen() {
    if (onboarding) return <OnboardingScreen user={user} onComplete={finishOnboarding} />;
    if (screen === "home") return <HomeScreen user={user} go={go} tryA={tryA} />;
    if (screen === "teams") return <RosterScreen user={user} tryA={tryA} />;
    if (screen === "schedule") {
      return (
        <ScheduleScreen
          user={user}
          tryA={tryA}
          prefillCreate={schedulePrefill}
          onPrefillConsumed={function () { setSchedulePrefill(null); }}
        />
      );
    }
    if (screen === "chat") {
      return (
        <ChatScreen
          user={user}
          tryA={tryA}
          canAccess={canAccess}
          initialDm={pendingChatDm}
          onInitialDmConsumed={function () { setPendingChatDm(null); }}
        />
      );
    }
    if (screen === "marketplace") {
      if (user.role === "player") {
        return (
          <PlayerContentScreen
            user={user}
            tryA={tryA}
            canAccess={canAccess}
            accessLevel={accessLevel}
          />
        );
      }
      return <StoreScreen user={user} tryA={tryA} canAccess={canAccess} accessLevel={accessLevel} />;
    }
    if (screen === "progress" && user.role === "coach") {
      return (
        <CoachProgressReviewScreen
          user={user}
          tryA={tryA}
          onSendFeedback={function (payload) {
            setPendingChatDm({
              playerId: payload.playerId,
              displayName: payload.displayName,
              draftMessage: 'Nice work on your latest drill — keep it up!',
            });
            go("chat");
          }}
          onShareViaSchedule={function (payload) {
            setSchedulePrefill({
              playerId: payload.playerId,
              contentKey: payload.contentKey,
              title: "Shared corrective drill",
            });
            go("schedule");
          }}
        />
      );
    }
    if (screen === "progress") return <ProgressScreen user={user} tryA={tryA} />;
    if (screen === "join-team") {
      return (
        <PlayerJoinTeamScreen
          initialCode={pendingInviteCode}
          onJoined={function () {
            clearPendingInvite();
          }}
          onBack={function () {
            setPendingInviteCode("");
            go("home");
          }}
        />
      );
    }
    if (screen === "profile") return <ProfileScreen user={user} go={go} onSignOut={handleSignOut} />;
    if (screen === "subscription") {
      return (
        <SubscriptionScreen
          user={user}
          subscription={subscriptionState.subscription}
          billingHistory={billingHistory}
          subscriptionStatus={subscriptionState.subscription?.status}
          busy={tierChangeBusy}
          error={tierChangeError}
          onChangeTier={handleChangeSubscriptionTier}
          onBack={function() { go("profile"); }}
        />
      );
    }
    if (screen === "objectives") return <ObjectivesScreen user={user} onBack={function() { go("home"); }} />;
    if (screen === "create-content") {
      return (
        <CreateContentScreen
          onBack={function () { go("home"); }}
          onViewLibrary={function (item) {
            setLibraryHighlightId(item?.id ?? null);
            setPackageSeedId(null);
            go("coach-library");
          }}
          onAttachToSession={function (prefill) {
            setSchedulePrefill(prefill);
            go("schedule");
          }}
          onBuildPackage={function (item) {
            setPackageSeedId(item?.id ?? null);
            setLibraryHighlightId(item?.id ?? null);
            go("coach-library");
          }}
        />
      );
    }
    if (screen === "coach-library") {
      return (
        <CoachLibraryScreen
          onBack={function () { go("create-content"); }}
          highlightId={libraryHighlightId}
          seedPackageItemId={packageSeedId}
          onAttachToSession={function (prefill) {
            setSchedulePrefill(prefill);
            go("schedule");
          }}
          onDistribute={function (item) {
            tryA("distribute", function () {
              setDistributeItem(item);
              go("distribute-content");
            });
          }}
        />
      );
    }
    if (screen === "distribute-content" && distributeItem) {
      return (
        <DistributeContentScreen
          item={distributeItem}
          onBack={function () {
            go("coach-library");
          }}
          onDistributed={function () {
            setDistributeItem(null);
            go("coach-library");
          }}
        />
      );
    }
    if (screen.indexOf("admin-") === 0) return <AdminDetailScreen screen={screen} onBack={function() { go("home"); }} />;
    return <HomeScreen user={user} go={go} tryA={tryA} />;
  }

  return (
    <AppShell
      overlay={
        paywall ? (
          <PaywallModal
            feature={paywall}
            user={user}
            featureFlagOverrides={featureFlagOverrides}
            subscription={subscriptionState.subscription}
            submitting={paywallBusy}
            error={paywallError}
            onClose={handlePaywallDismiss}
            onUpgrade={handlePaywallUpgrade}
            onStartTrial={handlePaywallStartTrial}
            onBrowseFree={handlePaywallBrowseFree}
          />
        ) : null
      }
      footer={
        user && !onboarding ? (
          <TabBar tabs={tabs} activeId={screen} onSelect={go} />
        ) : null
      }
    >
      {renderScreen()}
    </AppShell>
  );
}

export default function Coach360() {
  var _invite = useState(function () {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("invite") || "";
  }), pendingInviteCode = _invite[0], setPendingInviteCode = _invite[1];

  function clearPendingInvite() {
    setPendingInviteCode("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }

  return (
    <AuthGate>
      <ProfileGate>
        <TeamManagerTeamGate>
          <SubscriptionGate>
            <CoachOnboardingGate>
              <PlayerOnboardingGate
                pendingInviteCode={pendingInviteCode}
                onPendingInviteResolved={clearPendingInvite}
              >
                <Coach360App
                  pendingInviteCode={pendingInviteCode}
                  setPendingInviteCode={setPendingInviteCode}
                />
              </PlayerOnboardingGate>
            </CoachOnboardingGate>
          </SubscriptionGate>
        </TeamManagerTeamGate>
      </ProfileGate>
    </AuthGate>
  );
}
