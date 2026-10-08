import { Redis } from '@upstash/redis';

export const redis = Redis.fromEnv();

export const MAX_PLAYERS = 50;
export const GAME_SECONDS = 60;
export const BOT_FILL_DELAY_SECONDS = 8;

export function now() {
  return Date.now();
}

export function matchKey(id) {
  return `match:${id}`;
}

export function queueKey() {
  return 'matchmaking:queue';
}

export function playerKey(id) {
  return `player:${id}`;
}

export function randomId(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const BOT_NAMES = [
  'Nova', 'Pixel', 'Ace', 'Byte', 'Echo', 'Luna', 'Rex', 'Milo', 'Zed', 'Kai',
  'Nora', 'Max', 'Ivy', 'Leo', 'Zara', 'Neo', 'Maya', 'Finn', 'Arlo', 'Riya',
  'Dex', 'Ava', 'Noah', 'Mia', 'Jax', 'Theo', 'Liam', 'Nia', 'Kiro', 'Sia',
  'Ryan', 'Ella', 'Owen', 'Lara', 'Eli', 'Mika', 'Sam', 'Tara', 'Vik', 'Zoe',
  'Ari', 'Nico', 'Maya2', 'Rohan', 'Sara', 'Dev', 'Anya', 'Ishan', 'Mira', 'Kian'
];

function weightedNumber() {
  // Bots prefer high values, but not deterministically. This creates collisions.
  const r = Math.random();
  if (r < 0.70) return 40 + Math.floor(Math.random() * 25); // 40-64
  if (r < 0.92) return 20 + Math.floor(Math.random() * 20); // 20-39
  return 1 + Math.floor(Math.random() * 19); // 1-19
}

export function makeBots(count) {
  const bots = [];
  for (let i = 0; i < count; i++) {
    bots.push({
      id: `bot_${randomId()}`,
      name: BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ` ${i + 1}` : ''),
      bot: true,
      selection: weightedNumber(),
      selectedAt: now()
    });
  }
  return bots;
}

export function uniqueWinner(players) {
  const counts = new Map();
  for (const p of players) {
    if (p.selection == null) continue;
    counts.set(p.selection, (counts.get(p.selection) || 0) + 1);
  }

  let winner = null;
  for (const p of players) {
    if (p.selection == null) continue;
    if (counts.get(p.selection) !== 1) continue;
    if (!winner || p.selection > winner.selection) winner = p;
  }

  return winner ? { playerId: winner.id, playerName: winner.name, number: winner.selection } : null;
}

export function publicMatch(match, playerId) {
  const me = match.players.find(p => p.id === playerId);
  const selectedCount = match.players.filter(p => p.selection != null).length;
  const finished = match.status === 'FINISHED';

  const selectionCounts = {};
  if (finished) {
    for (const p of match.players) {
      if (p.selection != null) selectionCounts[p.selection] = (selectionCounts[p.selection] || 0) + 1;
    }
  }

  return {
    id: match.id,
    status: match.status,
    startedAt: match.startedAt,
    endsAt: match.endsAt,
    playerCount: match.players.length,
    selectedCount,
    mySelection: me?.selection ?? null,
    winner: match.winner ?? null,
    selectionCounts: finished ? selectionCounts : null,
    players: finished ? match.players.map(p => ({ id: p.id, name: p.name, selection: p.selection, bot: !!p.bot })) : null
  };
}

export async function finishIfNeeded(match) {
  if (match.status === 'ACTIVE' && now() >= match.endsAt) {
    match.status = 'FINISHED';
    match.winner = uniqueWinner(match.players);
    await redis.set(matchKey(match.id), match);
  }
  return match;
}
