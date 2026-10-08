import { redis, matchKey, finishIfNeeded, publicMatch } from './_game.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { matchId, playerId } = req.query;
    if (!matchId || !playerId) return res.status(400).json({ error: 'matchId and playerId are required' });
    let match = await redis.get(matchKey(matchId));
    if (!match) return res.status(404).json({ error: 'Match not found' });
    match = await finishIfNeeded(match);
    if (!match.players.some(p => p.id === playerId)) return res.status(403).json({ error: 'Player is not in this match' });
    return res.status(200).json({ match: publicMatch(match, playerId) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
