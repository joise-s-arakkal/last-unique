import { redis, matchKey, finishIfNeeded, publicMatch } from './_game.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { matchId, playerId, number } = req.body || {};
    const n = Number(number);
    if (!matchId || !playerId || !Number.isInteger(n) || n < 1 || n > 64) {
      return res.status(400).json({ error: 'Invalid selection' });
    }

    let match = await redis.get(matchKey(matchId));
    if (!match) return res.status(404).json({ error: 'Match not found' });
    match = await finishIfNeeded(match);

    if (match.status !== 'ACTIVE' || Date.now() >= match.endsAt) {
      return res.status(409).json({ error: 'The game has ended' });
    }

    const player = match.players.find(p => p.id === playerId);
    if (!player) return res.status(403).json({ error: 'Player is not in this match' });
    if (player.selection != null) return res.status(409).json({ error: 'Your selection is already locked' });
    if (player.bot) return res.status(403).json({ error: 'Bots cannot submit selections' });

    player.selection = n;
    player.selectedAt = Date.now();
    await redis.set(matchKey(match.id), match);

    return res.status(200).json({ match: publicMatch(match, playerId) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
