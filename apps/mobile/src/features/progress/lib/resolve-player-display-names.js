/** Resolve player display names for coach-facing UI (roster + profile fallback). */

export function playerDisplayLabel(nameMap, playerId) {
  const name = nameMap[playerId];
  if (name && name.trim()) {
    return name.trim();
  }
  return 'Player';
}

export async function resolvePlayerDisplayNames(repos, teamList, playerIds) {
  const nameMap = {};
  const uniqueIds = [...new Set(playerIds.filter(Boolean))];

  const memberLists = await Promise.all(
    teamList.map(function (team) {
      return repos.rosters.listMembers(team.id);
    }),
  );

  for (const members of memberLists) {
    for (const member of members) {
      if (member.rosterRole === 'player' && member.profileId && member.displayName) {
        nameMap[member.profileId] = member.displayName;
      }
    }
  }

  const missing = uniqueIds.filter(function (id) {
    return !nameMap[id];
  });

  await Promise.all(
    missing.map(async function (playerId) {
      try {
        const profile = await repos.profiles.getById(playerId);
        if (profile?.displayName?.trim()) {
          nameMap[playerId] = profile.displayName.trim();
        }
      } catch {
        // RLS or network — leave unset; UI falls back to "Player"
      }
    }),
  );

  return nameMap;
}
