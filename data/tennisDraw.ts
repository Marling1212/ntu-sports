import { Player, Match } from "@/types/tournament";

// Generate 64 players with 8 seeds
export function generateTennisPlayers(): Player[] {
  const players: Player[] = [];
  
  // 8 seeded players
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const seedNames = [
    "張一鳴", "李二虎", "王三強", "陳四維",
    "林五龍", "黃六鳳", "吳七賢", "鄭八德"
  ];
  
  seeds.forEach((seed, index) => {
    players.push({
      id: `seed-${seed}`,
      name: seedNames[index],
      seed: seed,
      school: `NTU ${seed === 1 ? "CE" : seed === 2 ? "CSIE" : seed === 3 ? "EE" : "ME"}`,
    });
  });
  
  // 56 unseeded players
  const unseededNames = [
    "許九安", "謝十全", "何十一", "羅十二", "高十三", "周十四", "蔡十五", "曾十六",
    "蕭十七", "葉十八", "蘇十九", "潘二十", "盧二一", "蔣二二", "戴二三", "薛二四",
    "柯二五", "溫二六", "方二七", "施二八", "韓二九", "范三十", "江三一", "唐三二",
    "余三三", "鄧三四", "邱三五", "洪三六", "朱三七", "董三八", "梁三九", "歐四十",
    "程四一", "彭四二", "沈四三", "姚四四", "胡四五", "袁四六", "賴四七", "莊四八",
    "許四九", "白五十", "廖五一", "盧五二", "石五三", "譚五四", "顧五五", "黎五六",
    "金五七", "錢五八", "孫五九", "鍾六十", "陸六一", "徐六二", "傅六三", "丁六四"
  ];
  
  unseededNames.forEach((name, index) => {
    players.push({
      id: `player-${index + 9}`,
      name: name,
      school: `NTU ${index % 8 === 0 ? "CE" : index % 8 === 1 ? "CSIE" : index % 8 === 2 ? "EE" : "ME"}`,
    });
  });
  
  return players;
}

// Seed players according to tournament bracket rules
// Seeds are placed to avoid meeting until later rounds
export function seedPlayers(players: Player[]): Player[] {
  const seeded = players.filter(p => p.seed);
  const unseeded = players.filter(p => !p.seed);
  
  // Sort seeds
  seeded.sort((a, b) => (a.seed || 0) - (b.seed || 0));
  
  // Create bracket positions (64 total)
  const positions: (Player | null)[] = new Array(64).fill(null);
  
  // Place seeds according to bracket structure
  // Seed 1 goes to position 0
  // Seed 64 would go to position 63, but we only have 8 seeds
  // Standard tournament seeding:
  const seedPositions = [
    0,   // Seed 1 - top
    63,  // Seed 2 - bottom
    32,  // Seed 3
    31,  // Seed 4
    16,  // Seed 5
    47,  // Seed 6
    48,  // Seed 7
    15,  // Seed 8
  ];
  
  seeded.forEach((player, index) => {
    if (seedPositions[index] !== undefined) {
      positions[seedPositions[index]] = player;
    }
  });
  
  // Fill remaining positions with unseeded players
  let unseededIndex = 0;
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] === null && unseededIndex < unseeded.length) {
      positions[i] = unseeded[unseededIndex++];
    }
  }
  
  return positions.filter((p): p is Player => p !== null);
}

// Generate initial matches for Round 1 (64 players = 32 matches)
export function generateMatches(seededPlayers: Player[]): Match[] {
  const matches: Match[] = [];
  let matchId = 1;
  
  // Round 1: 32 matches (64 players)
  for (let i = 0; i < 32; i++) {
    const player1 = seededPlayers[i * 2] || null;
    const player2 = seededPlayers[i * 2 + 1] || null;
    
    matches.push({
      id: `r1-m${matchId++}`,
      round: 1,
      matchNumber: i + 1,
      player1: player1,
      player2: player2,
      status: "upcoming",
    });
  }
  
  // Round 2: 16 matches (Round of 32)
  for (let i = 0; i < 16; i++) {
    matches.push({
      id: `r2-m${i + 1}`,
      round: 2,
      matchNumber: i + 1,
      status: "upcoming",
    });
  }
  
  // Round 3: 8 matches (Round of 16)
  for (let i = 0; i < 8; i++) {
    matches.push({
      id: `r3-m${i + 1}`,
      round: 3,
      matchNumber: i + 1,
      status: "upcoming",
    });
  }
  
  // Round 4: 4 matches (Quarterfinals)
  for (let i = 0; i < 4; i++) {
    matches.push({
      id: `r4-m${i + 1}`,
      round: 4,
      matchNumber: i + 1,
      status: "upcoming",
    });
  }
  
  // Round 5: 2 matches (Semifinals)
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: `r5-m${i + 1}`,
      round: 5,
      matchNumber: i + 1,
      status: "upcoming",
    });
  }
  
  // Round 6: 1 match (Final)
  matches.push({
    id: `r6-m1`,
    round: 6,
    matchNumber: 1,
    status: "upcoming",
  });
  
  return matches;
}


