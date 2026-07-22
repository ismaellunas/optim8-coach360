/** Resolve peer display names for chat (roster + profile fallback). */

export function playerDisplayLabel(nameMap, playerId) {
  const name = nameMap[playerId];
  if (name && name.trim()) {
    return name.trim();
  }
  return 'Player';
}

/** Prefer mapped name, then conversation title — never invent "Player" for unknown peers. */
export function chatPeerDisplayLabel(nameMap, peerId, fallbackTitle) {
  const mapped = nameMap?.[peerId];
  if (mapped && mapped.trim()) {
    return mapped.trim();
  }
  if (fallbackTitle && fallbackTitle.trim()) {
    return fallbackTitle.trim();
  }
  return 'Conversation';
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
      if (member.profileId && member.displayName) {
        nameMap[member.profileId] = member.displayName;
      }
    }
  }

  for (const team of teamList) {
    if (team.createdBy && !nameMap[team.createdBy]) {
      uniqueIds.push(team.createdBy);
    }
  }

  const missing = [...new Set(uniqueIds)].filter(function (id) {
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
        // RLS or network — leave unset; UI falls back to conversation title
      }
    }),
  );

  return nameMap;
}
