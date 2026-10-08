import { redis, MAX_PLAYERS, GAME_SECONDS, BOT_FILL_DELAY_SECONDS, now, matchKey, queueKey, randomId, makeBots } from './_game.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { playerId, name } = req.body || {};
    const cleanName = String(name || '').trim().slice(0, 24);
    const cleanId = String(playerId || '').trim().slice(0, 80);
    if (!cleanName || !cleanId) return res.status(400).json({ error: 'Name and playerId are required' });

    const existingMatchId = await redis.get(`active-player:${cleanId}`);
    if (existingMatchId) {
      const existing = await redis.get(matchKey(existingMatchId));
      if (existing && existing.status !== 'FINISHED') {
        return res.status(200).json({ match: existing, playerId: cleanId });
      }
    }

    let queue = await redis.get(queueKey());
    if (!Array.isArray(queue)) queue = [];

    const alreadyQueued = queue.find(p => p.id === cleanId);
    if (!alreadyQueued) {
      queue.push({ id: cleanId, name: cleanName, joinedAt: now() });
    }

    let match = null;

    if (queue.length >= MAX_PLAYERS) {
      const participants = queue.splice(0, MAX_PLAYERS);
      match = createMatch(participants);
      await redis.set(matchKey(match.id), match);
      for (const p of participants) await redis.set(`active-player:${p.id}`, match.id, { ex: 3600 });
    } else {
      const oldest = queue[0];
      const waitingLongEnough = oldest && now() - oldest.joinedAt >= BOT_FILL_DELAY_SECONDS * 1000;
      if (waitingLongEnough) {
        const participants = queue.splice(0);
        const bots = makeBots(MAX_PLAYERS - participants.length);
        match = createMatch(participants.concat(bots));
        await redis.set(matchKey(match.id), match);
        for (const p of participants) await redis.set(`active-player:${p.id}`, match.id, { ex: 3600 });
      }
    }

    await redis.set(queueKey(), queue);

    if (!match) {
      return res.status(200).json({ waiting: true, position: queue.findIndex(p => p.id === cleanId) + 1, queueSize: queue.length });
    }

    return res.status(200).json({ match: publicMatchForJoin(match, cleanId), playerId: cleanId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}

function createMatch(players) {
  const start = now();
  return {
    id: `M-${randomId().toUpperCase()}`,
    status: 'ACTIVE',
    createdAt: start,
    startedAt: start,
    endsAt: start + GAME_SECONDS * 1000,
    players: players.map(p => ({ ...p, selection: p.selection ?? null, selectedAt: p.selectedAt ?? null })),
    winner: null
  };
}

function publicMatchForJoin(match, playerId) {
  const me = match.players.find(p => p.id === playerId);
  return {
    id: match.id,
    status: match.status,
    startedAt: match.startedAt,
    endsAt: match.endsAt,
    playerCount: match.players.length,
    selectedCount: match.players.filter(p => p.selection != null).length,
    mySelection: me?.selection ?? null,
    winner: match.winner
  };
}
