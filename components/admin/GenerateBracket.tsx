"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { buildSeedTemplate } from "@/lib/utils/seedTemplate";

export type SeedingMode = "strict" | "grand_slam";

interface GenerateBracketProps {
  eventId: string;
  players: Player[];
  defaultDivisionId?: string | null;
}

export default function GenerateBracket({ eventId, players, defaultDivisionId }: GenerateBracketProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true); // 預設舉辦季軍賽
  const [seedingMode, setSeedingMode] = useState<SeedingMode>("strict");
  const supabase = createClient();

  const generateBracket = async () => {
    if (players.length < 2) {
      toast.error(t('admin.generateBracket.minPlayersToast', { n: players.length }));
      return;
    }

    // Calculate bracket size (next power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const numRounds = Math.log2(bracketSize);
    const numByes = bracketSize - players.length;
    const totalMatches = bracketSize - 1;

    const seededCount = players.filter(p => p.seed).length;
    const modeName = seedingMode === 'grand_slam'
      ? t('admin.generateBracket.grandSlamModeTitle')
      : t('admin.generateBracket.strictModeTitle');

    const rules: string[] = [];
    if (seedingMode === 'grand_slam') {
      rules.push(t('admin.generateBracket.ruleGrandSlamTitle'));
      rules.push(t('admin.generateBracket.ruleGrandSlam1'));
      rules.push(t('admin.generateBracket.ruleGrandSlam2'));
      rules.push(t('admin.generateBracket.ruleGrandSlam3'));
      rules.push(t('admin.generateBracket.ruleGrandSlam4'));
    } else {
      rules.push(t('admin.generateBracket.ruleStrictTitle'));
      rules.push(t('admin.generateBracket.ruleStrict1'));
    }

    if (numByes > 0) {
      rules.push(t('admin.generateBracket.ruleBye1'));
      rules.push(t('admin.generateBracket.ruleBye2'));
    } else {
      rules.push(t('admin.generateBracket.ruleNoBye'));
    }
    rules.push(t('admin.generateBracket.ruleUnseeded'));

    const confirmText = `${t('admin.generateBracket.confirmTitle')}\n\n` +
      `${t('admin.generateBracket.currentPlayers', { n: players.length })}\n` +
      `- 種子: ${seededCount}\n` +
      `- 非種子: ${players.length - seededCount}\n\n` +
      `${t('admin.generateBracket.bracketSize', { size: bracketSize, rounds: numRounds })}\n` +
      `${t('admin.generateBracket.totalMatches', { matches: totalMatches })}\n` +
      (numByes > 0 ? `${t('admin.generateBracket.byesCount', { byes: numByes })}\n\n` : '\n') +
      `[ ${t('admin.generateBracket.seedingModeLabel')}: ${modeName} ]\n` +
      `${rules.join('\n')}`;

    if (!confirm(confirmText)) return;

    setLoading(true);

    try {
      // Seed players according to bracket rules
      const seeded = players.filter(p => p.seed).sort((a, b) => (a.seed || 0) - (b.seed || 0));
      const positions: (Player | null)[] = new Array(bracketSize).fill(null);
      const placedSeedIds = new Set<string>();

      const seedTemplate = buildSeedTemplate(bracketSize);

      if (seedingMode === "strict" || bracketSize < 4) {
        // Strict Standard Template: place ALL valid seed numbers (1..bracketSize) to their proper seeded slots.
        seeded.forEach((player) => {
          const seedNum = player.seed || 0;
          if (seedNum < 1 || seedNum > bracketSize) return;
          const slotIndex = seedTemplate.findIndex((s) => s === seedNum);
          if (slotIndex < 0) return;
          if (!positions[slotIndex]) {
            positions[slotIndex] = player;
            placedSeedIds.add(player.id);
          }
        });
      } else {
        // Controlled Grand Slam Draw with QF constraints:
        // 1. Seeds 1 & 2: Locked at opposite bracket extremes (Slot 0 in Top Half vs Slot bracketSize - 1 in Bottom Half)
        // 2. Seeds 3 & 4: Randomly drawn into opposite halves
        // 3. Seeds 5 & 6: Constrained to quarters with Seed 3 & 4 (Projected QF matchups: 3v6, 4v5, 3v5, or 4v6)
        // 4. Seeds 7 & 8: Constrained to quarters with Seed 1 & 2 (Projected QF matchups: 1v8, 2v7, 1v7, or 2v8)
        // 5. Seeds > 8: Standard template position
        const seedMap = new Map<number, Player>();
        seeded.forEach((p) => {
          if (p.seed && p.seed >= 1 && p.seed <= bracketSize) {
            seedMap.set(p.seed, p);
          }
        });

        const placeSeedInSlot = (seedNum: number, slotIdx: number) => {
          const player = seedMap.get(seedNum);
          if (player && slotIdx >= 0 && slotIdx < bracketSize && !positions[slotIdx]) {
            positions[slotIdx] = player;
            placedSeedIds.add(player.id);
          }
        };

        if (bracketSize === 4) {
          // Seeds 1 and 2
          placeSeedInSlot(1, seedTemplate.indexOf(1)); // Slot 0
          placeSeedInSlot(2, seedTemplate.indexOf(2)); // Slot 3

          // Seeds 3 and 4 randomly placed in opposite halves (Slot 1 and Slot 2)
          const s4Slot = seedTemplate.indexOf(4); // Slot 1
          const s3Slot = seedTemplate.indexOf(3); // Slot 2
          if (Math.random() < 0.5) {
            placeSeedInSlot(3, s3Slot);
            placeSeedInSlot(4, s4Slot);
          } else {
            placeSeedInSlot(3, s4Slot);
            placeSeedInSlot(4, s3Slot);
          }
        } else {
          // bracketSize >= 8
          // 1. Seeds 1 and 2: Locked at opposite bracket extremes (Q1 primary at 0 & Q4 primary at bracketSize - 1)
          const slotQ1_prim = seedTemplate.indexOf(1);
          const slotQ4_prim = seedTemplate.indexOf(2);
          placeSeedInSlot(1, slotQ1_prim);
          placeSeedInSlot(2, slotQ4_prim);

          // 2. Seeds 3 and 4: Randomly drawn into opposite halves (Q2 primary vs Q3 primary)
          const slotQ2_prim = seedTemplate.indexOf(4);
          const slotQ3_prim = seedTemplate.indexOf(3);
          const seed3ToQ2 = Math.random() < 0.5;

          const slotForSeed3 = seed3ToQ2 ? slotQ2_prim : slotQ3_prim;
          const slotForSeed4 = seed3ToQ2 ? slotQ3_prim : slotQ2_prim;
          const quarterOfSeed3 = seed3ToQ2 ? 2 : 3;
          const quarterOfSeed4 = seed3ToQ2 ? 3 : 2;

          placeSeedInSlot(3, slotForSeed3);
          placeSeedInSlot(4, slotForSeed4);

          // 3. Seeds 5 and 6: Constrained to quarters containing Seed 3 and Seed 4 (Q2 and Q3)
          const slotQ2_sec = seedTemplate.indexOf(5);
          const slotQ3_sec = seedTemplate.indexOf(6);
          const slotSecForSeed3Quarter = quarterOfSeed3 === 2 ? slotQ2_sec : slotQ3_sec;
          const slotSecForSeed4Quarter = quarterOfSeed4 === 2 ? slotQ2_sec : slotQ3_sec;

          // 50% chance: Seed 5 meets 4, Seed 6 meets 3 (4v5, 3v6)
          // 50% chance: Seed 5 meets 3, Seed 6 meets 4 (3v5, 4v6)
          if (Math.random() < 0.5) {
            placeSeedInSlot(5, slotSecForSeed4Quarter);
            placeSeedInSlot(6, slotSecForSeed3Quarter);
          } else {
            placeSeedInSlot(5, slotSecForSeed3Quarter);
            placeSeedInSlot(6, slotSecForSeed4Quarter);
          }

          // 4. Seeds 7 and 8: Constrained to quarters containing Seed 1 and Seed 2 (Q1 and Q4)
          const slotQ1_sec = seedTemplate.indexOf(8);
          const slotQ4_sec = seedTemplate.indexOf(7);

          // 50% chance: Seed 8 meets 1, Seed 7 meets 2 (1v8, 2v7)
          // 50% chance: Seed 7 meets 1, Seed 8 meets 2 (1v7, 2v8)
          if (Math.random() < 0.5) {
            placeSeedInSlot(8, slotQ1_sec);
            placeSeedInSlot(7, slotQ4_sec);
          } else {
            placeSeedInSlot(7, slotQ1_sec);
            placeSeedInSlot(8, slotQ4_sec);
          }

          // 5. Any remaining seeds > 8 (if present)
          seeded.forEach((player) => {
            const seedNum = player.seed || 0;
            if (seedNum > 8 && seedNum <= bracketSize) {
              const slotIndex = seedTemplate.findIndex((s) => s === seedNum);
              if (slotIndex >= 0 && !positions[slotIndex]) {
                positions[slotIndex] = player;
                placedSeedIds.add(player.id);
              }
            }
          });
        }
      }

      // Remaining players enter random draw pool.
      const drawPool = players.filter(p => !placedSeedIds.has(p.id));

      // Randomize draw pool using Fisher-Yates shuffle
      const shuffledUnseeded = [...drawPool];
      for (let i = shuffledUnseeded.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledUnseeded[i], shuffledUnseeded[j]] = [shuffledUnseeded[j], shuffledUnseeded[i]];
      }
      
      // FINAL CORRECT Strategy:
      // 1. 計算可以安排多少場"非種子互打"
      // 2. 優先給前面的種子（讓他們第二輪對手先打過）
      // 3. 其餘非種子和BYE隨機分配
      // 4. 絕對不能出現 BYE vs BYE!
      
      /** Fill / consume slots in quarter-interleaved order so play-ins and byes are not all clustered in bracket "section 1". */
      const spreadSlotOrder = (size: number): number[] => {
        if (size <= 0) return [];
        if (size < 4) return Array.from({ length: size }, (_, i) => i);
        const qSize = size / 4;
        const out: number[] = [];
        for (let offset = 0; offset < qSize; offset++) {
          for (let q = 0; q < 4; q++) {
            out.push(q * qSize + offset);
          }
        }
        return out;
      };

      const r1MatchCount = bracketSize / 2;
      const matchQuarter = (matchIdx0: number) => {
        if (r1MatchCount < 4) return 0;
        const per = r1MatchCount / 4;
        return Math.min(3, Math.floor(matchIdx0 / per));
      };

      /** Round-robin seed slots across R1 quarters (keeps relative order within each quarter). */
      const reorderSeedPositionsForQuarterSpread = (positionsArr: number[]): number[] => {
        const buckets: number[][] = [[], [], [], []];
        for (const sp of positionsArr) {
          buckets[matchQuarter(Math.floor(sp / 2))].push(sp);
        }
        const out: number[] = [];
        let progressed = true;
        while (progressed) {
          progressed = false;
          for (let q = 0; q < 4; q++) {
            if (buckets[q].length > 0) {
              out.push(buckets[q].shift()!);
              progressed = true;
            }
          }
        }
        return out;
      };

      console.log(`\n=== 開始分配選手 ===`);
      console.log(`種子數: ${seeded.length}, 非種子數: ${shuffledUnseeded.length}`);
      console.log(`籤表大小: ${bracketSize}, 總 BYE 數: ${numByes}`);
      
      // 計算可以產生多少場非種子互打
      // 總位置 = bracketSize
      // 種子占用 = seeded.length
      // 種子對手位置（預留BYE）= seeded.length
      // 剩餘位置 = bracketSize - seeded.length * 2
      const remainingSlots = bracketSize - (seeded.length * 2);
      const unseededAvailable = shuffledUnseeded.length;
      
      // 可以產生的非種子互打場數
      const unseededMatchesPossible = Math.floor(Math.min(remainingSlots, unseededAvailable) / 2);
      
      console.log(`剩餘位置: ${remainingSlots}, 非種子可用: ${unseededAvailable}`);
      console.log(`可產生非種子互打: ${unseededMatchesPossible} 場 (需要 ${unseededMatchesPossible * 2} 個非種子)`);
      
      // 決定給哪些種子這個優勢
      // 大量 BYE（例如 70 人進 128 格）時，若先消耗非種子去做「互打優勢」，
      // 反而會觸發後續「非種子不足」誤判；此情況改為不先做優勢配對。
      const useSeedAdvantageMatches = numByes <= seeded.length;
      const seedsWithAdvantage = useSeedAdvantageMatches
        ? Math.min(seeded.length, unseededMatchesPossible)
        : 0;
      console.log(`可給予優勢的種子數: ${seedsWithAdvantage}`);
      
      let unseededIndex = 0;
      
      // Step 1: 為前N個種子安排"對手要先打過"的優勢
      const seedPositions: number[] = [];
      positions.forEach((player, index) => {
        if (player && player.seed) {
          seedPositions.push(index);
        }
      });
      
      // 按種子號碼排序
      seedPositions.sort((a, b) => {
        const seedA = positions[a]?.seed || 999;
        const seedB = positions[b]?.seed || 999;
        return seedA - seedB;
      });

      const sortedSeedSlotsByRank = [...seedPositions].sort(
        (a, b) => (positions[a]?.seed || 999) - (positions[b]?.seed || 999)
      );
      const advantageSeedSlots = sortedSeedSlotsByRank.slice(0, seedsWithAdvantage);
      const advantageOrder = reorderSeedPositionsForQuarterSpread(advantageSeedSlots);
      
      console.log(`\n為前 ${seedsWithAdvantage} 個種子安排對手互打（種子號最小者優先，分配順序依 1/4 區輪流）：`);
      
      for (let i = 0; i < advantageOrder.length && unseededIndex + 1 < shuffledUnseeded.length; i++) {
        const seedPos = advantageOrder[i];
        const round1MatchNum = Math.floor(seedPos / 2);
        const isEvenMatch = round1MatchNum % 2 === 0;
        const opponentMatchNum = isEvenMatch ? round1MatchNum + 1 : round1MatchNum - 1;
        
        const opponentPos1 = opponentMatchNum * 2;
        const opponentPos2 = opponentMatchNum * 2 + 1;
        
        // 確保兩個位置都空
        if (!positions[opponentPos1] && !positions[opponentPos2]) {
          positions[opponentPos1] = shuffledUnseeded[unseededIndex++];
          positions[opponentPos2] = shuffledUnseeded[unseededIndex++];
          console.log(`  Seed ${positions[seedPos]?.seed} (pos ${seedPos}) → 對手比賽 ${opponentMatchNum} (pos ${opponentPos1}-${opponentPos2})`);
        }
      }
      
      console.log(`已使用 ${unseededIndex} 個非種子選手`);
      
      // Step 2: 將剩餘非種子選手分配到空位
      // 關鍵策略：確保每個完全空的配對至少有一個人！
      const emptyPairs: [number, number][] = [];
      for (let i = 0; i < bracketSize; i += 2) {
        const pos1 = i;
        const pos2 = i + 1;
        
        // 跳過種子位置
        if ((positions[pos1] && positions[pos1].seed) || (positions[pos2] && positions[pos2].seed)) {
          continue;
        }
        
        const pos1Empty = !positions[pos1];
        const pos2Empty = !positions[pos2];
        
        if (pos1Empty || pos2Empty) {
          emptyPairs.push([pos1, pos2]);
        }
      }
      
      const remainingUnseeded = shuffledUnseeded.length - unseededIndex;
      console.log(`\n剩餘 ${emptyPairs.length} 個配對需要處理`);
      console.log(`剩餘 ${remainingUnseeded} 個非種子選手`);
      
      // 分類配對
      let fullyEmptyPairs = emptyPairs.filter(([p1, p2]) => !positions[p1] && !positions[p2]);
      const partiallyEmptyPairs = emptyPairs.filter(([p1, p2]) => positions[p1] || positions[p2]);
      const slotPri = new Map<number, number>();
      spreadSlotOrder(bracketSize).forEach((pos, pri) => slotPri.set(pos, pri));
      fullyEmptyPairs.sort(
        (a, b) =>
          Math.min(slotPri.get(a[0]) ?? 999, slotPri.get(a[1]) ?? 999) -
          Math.min(slotPri.get(b[0]) ?? 999, slotPri.get(b[1]) ?? 999)
      );
      
      console.log(`完全空配對: ${fullyEmptyPairs.length}, 部分空配對: ${partiallyEmptyPairs.length}`);
      
      // 策略：先確保每個完全空的配對至少有一個人
      // 計算需要多少人才能填滿所有完全空配對（每場至少1人）
      const minPlayersNeeded = fullyEmptyPairs.length;
      
      if (remainingUnseeded < minPlayersNeeded) {
        console.error(`❌ 非種子選手不足！需要至少 ${minPlayersNeeded} 人，只有 ${remainingUnseeded} 人`);
        toast.error(`非種子選手數量不足以避免 BYE vs BYE！需要至少 ${seeded.length * 2 + minPlayersNeeded} 個選手。`);
        setLoading(false);
        return;
      }
      
      // Phase 1: 先給每個完全空配對至少一個人（隨機哪一邊）
      console.log(`\nPhase 1: 確保每個完全空配對至少有一人`);
      fullyEmptyPairs.forEach(([pos1, pos2]) => {
        if (unseededIndex < shuffledUnseeded.length) {
          const fillPos = Math.random() < 0.5 ? pos1 : pos2;
          positions[fillPos] = shuffledUnseeded[unseededIndex++];
        }
      });
      
      console.log(`Phase 1 完成: 使用 ${minPlayersNeeded} 個非種子，剩餘 ${shuffledUnseeded.length - unseededIndex} 個`);
      
      // Phase 2: 用剩餘的非種子填充空位
      console.log(`\nPhase 2: 填充剩餘空位`);
      
      // 關鍵修正：當 numByes = 0 時，所有位置都必須填滿，包括種子對手位置
      // 當 numByes > 0 時，種子優先獲得 BYE（跳過種子對手位置）
      if (numByes === 0) {
        // 沒有 BYE：填充所有空位，確保所有選手都參賽
        console.log(`無 BYE 情況：填充所有空位（包括種子對手位置）`);
        for (const i of spreadSlotOrder(bracketSize)) {
          if (!positions[i] && unseededIndex < shuffledUnseeded.length) {
            positions[i] = shuffledUnseeded[unseededIndex++];
          }
        }
      } else {
        // 有 BYE：種子優先獲得 BYE，但需要確保所有非種子選手都被分配
        console.log(`有 BYE 情況：種子優先獲得 BYE，剩餘非種子填充其他空位`);
        
        // 計算需要多少個 BYE 給種子（優先給前幾個種子）
        const seedByesNeeded = Math.min(seeded.length, numByes);
        const remainingByes = numByes - seedByesNeeded;
        
        // 找出所有種子位置，按種子號碼排序
        const seedPositions: number[] = [];
        for (let i = 0; i < bracketSize; i++) {
          const player = positions[i];
          if (player && player.seed) {
            seedPositions.push(i);
          }
        }
        seedPositions.sort((a, b) => {
          const seedA = positions[a]?.seed || 999;
          const seedB = positions[b]?.seed || 999;
          return seedA - seedB;
        });
        
        // 只為前 seedByesNeeded 個種子保留對手位置為 BYE
        const seedOpponentPositionsForBye = new Set<number>();
        for (let i = 0; i < seedByesNeeded && i < seedPositions.length; i++) {
          const seedPos = seedPositions[i];
          const matchPos = Math.floor(seedPos / 2) * 2;
          const opponentPos = seedPos % 2 === 0 ? matchPos + 1 : matchPos;
          if (!positions[opponentPos]) {
            seedOpponentPositionsForBye.add(opponentPos);
            console.log(`  為種子 ${positions[seedPos]?.seed} (位置 ${seedPos}) 保留對手位置 ${opponentPos} 為 BYE`);
          }
        }
        
        console.log(`  總共為 ${seedOpponentPositionsForBye.size} 個種子保留 BYE，剩餘 ${remainingByes} 個 BYE 給非種子`);
        
        // 填充所有空位，但跳過為種子保留的 BYE 位置（依四區輪流順位填，避免擠在同一區）
        for (const i of spreadSlotOrder(bracketSize)) {
          if (!positions[i] && unseededIndex < shuffledUnseeded.length) {
            // 如果這個位置是為種子保留的 BYE 位置，則跳過
            if (seedOpponentPositionsForBye.has(i)) {
              continue;
            }
            
            // 否則填充這個位置
            positions[i] = shuffledUnseeded[unseededIndex++];
          }
        }
        
        // 驗證：確保所有非種子選手都被分配（除了保留的 BYE 位置）
        const totalByePositions = seedOpponentPositionsForBye.size + remainingByes;
        const expectedFilledPositions = bracketSize - totalByePositions;
        const actualFilledPositions = positions.filter(p => p !== null).length;
        
        if (unseededIndex < shuffledUnseeded.length) {
          console.log(`警告：還有 ${shuffledUnseeded.length - unseededIndex} 個非種子選手未分配`);
          console.log(`  已填充位置: ${actualFilledPositions} / ${bracketSize}, BYE 位置: ${totalByePositions}`);
        }
      }
      
      console.log(`總共使用 ${unseededIndex} / ${shuffledUnseeded.length} 非種子選手`);
      
      // 驗證：確保所有非種子選手都被分配
      // 當 numByes = 0 時，所有非種子都必須被分配
      // 當 numByes > 0 時，所有非種子也應該被分配（BYE 位置不應該占用非種子名額）
      const expectedUnseededUsed = numByes === 0 
        ? shuffledUnseeded.length 
        : shuffledUnseeded.length; // 無論如何，所有非種子都應該被分配
      
      if (unseededIndex < shuffledUnseeded.length) {
        console.error(`❌ 錯誤：還有 ${shuffledUnseeded.length - unseededIndex} 個非種子選手未分配！`);
        console.error(`  預期使用: ${expectedUnseededUsed}, 實際使用: ${unseededIndex}`);
        toast.error(`籤表生成錯誤：無法分配所有非種子選手（${unseededIndex}/${shuffledUnseeded.length}）。`);
        setLoading(false);
        return;
      }
      
      // Step 3: 驗證
      let byeVsByeCount = 0;
      let seedByeCount = 0;
      let unseededByeCount = 0;
      let unseededMatchCount = 0;
      let seedVsUnseededCount = 0;
      let filledPositions = 0;
      
      for (let i = 0; i < bracketSize; i += 2) {
        const player1 = positions[i];
        const player2 = positions[i + 1];
        
        if (!player1 && !player2) {
          byeVsByeCount++;
          console.error(`❌ BYE vs BYE at position ${i}-${i+1}`);
        } else if (player1?.seed && !player2) {
          seedByeCount++;
          filledPositions++;
        } else if (player2?.seed && !player1) {
          seedByeCount++;
          filledPositions++;
        } else if ((player1 && !player1.seed && !player2) || (player2 && !player2.seed && !player1)) {
          unseededByeCount++;
          filledPositions++;
        } else if (player1 && player2) {
          filledPositions += 2;
          if (player1.seed && !player2.seed) {
            seedVsUnseededCount++;
          } else if (!player1.seed && player2.seed) {
            seedVsUnseededCount++;
          } else if (player1 && !player1.seed && player2 && !player2.seed) {
            unseededMatchCount++;
          }
        }
      }
      
      console.log(`\n=== 籤表檢查 ===`);
      console.log(`已填充位置: ${filledPositions} / ${bracketSize}`);
      console.log(`✓ 種子 vs BYE: ${seedByeCount} 場`);
      console.log(`✓ 種子 vs 非種子: ${seedVsUnseededCount} 場`);
      console.log(`✓ 非種子 vs BYE: ${unseededByeCount} 場`);
      console.log(`✓ 非種子 vs 非種子: ${unseededMatchCount} 場`);
      console.log(`${byeVsByeCount === 0 ? '✓' : '❌'} BYE vs BYE: ${byeVsByeCount} 場`);
      
      // 驗證：當 numByes = 0 時，所有位置都應該被填充
      if (numByes === 0 && filledPositions !== bracketSize) {
        console.error(`❌ 錯誤：當無 BYE 時，應該填充 ${bracketSize} 個位置，但只填充了 ${filledPositions} 個`);
        toast.error(`籤表生成失敗：無法填充所有位置。請檢查邏輯。`);
        setLoading(false);
        return;
      }
      
      // 驗證：當 numByes = 0 時，不應該有任何 BYE
      if (numByes === 0 && (seedByeCount > 0 || unseededByeCount > 0)) {
        console.error(`❌ 錯誤：當無 BYE 時，不應該有任何 BYE，但發現 ${seedByeCount + unseededByeCount} 個 BYE`);
        toast.error(`籤表生成失敗：無 BYE 情況下不應該出現 BYE。`);
        setLoading(false);
        return;
      }
      
      // 驗證：當 numByes > 0 時，BYE 總數應該等於 numByes
      const totalByes = seedByeCount + unseededByeCount;
      if (numByes > 0 && totalByes !== numByes) {
        console.error(`❌ 錯誤：應該有 ${numByes} 個 BYE，但發現 ${totalByes} 個 BYE`);
        toast.error(`籤表生成失敗：BYE 數量不正確（應有 ${numByes} 個，實際 ${totalByes} 個）。`);
        setLoading(false);
        return;
      }
      
      // 驗證：種子 BYE 數量不應該超過種子數量
      if (seedByeCount > seeded.length) {
        console.error(`❌ 錯誤：種子 BYE 數量 ${seedByeCount} 超過種子數量 ${seeded.length}`);
        toast.error(`籤表生成失敗：種子 BYE 數量異常。`);
        setLoading(false);
        return;
      }
      
      if (byeVsByeCount > 0) {
        toast.error(`籤表生成失敗：出現 ${byeVsByeCount} 場 BYE vs BYE！這不應該發生。`);
        setLoading(false);
        return;
      }

      // Generate matches for all rounds
      // Key: Create ALL matches including BYE, but mark BYE matches with status 'bye'
      const divisionPayload = defaultDivisionId ? { division_id: defaultDivisionId } : {};
      const matches = [];
      // Store which player advances to which position in Round 2
      // Key: "round2-match-slot" (e.g., "1-1" = Round 2 Match 1 Player 1)
      // Value: player ID
      const round2Advances: Map<string, string> = new Map();
      let matchesInRound = bracketSize / 2;
      let byeMatchCount = 0;

      for (let round = 1; round <= numRounds; round++) {
        for (let i = 0; i < matchesInRound; i++) {
          if (round === 1) {
            // Round 1: pair up players based on positions
            const player1 = positions[i * 2];
            const player2 = positions[i * 2 + 1];
            const matchNum = i + 1;
            
            // Calculate which Round 2 match this feeds into
            const nextRoundMatch = Math.ceil(matchNum / 2);
            const feedsPlayer1 = matchNum % 2 === 1; // Odd matches feed player1, even feed player2
            const slotKey = `${nextRoundMatch}-${feedsPlayer1 ? '1' : '2'}`;
            
            // Check if this is a BYE match
            if (player1 && !player2) {
              // Player 1 gets BYE
              round2Advances.set(slotKey, player1.id);
              console.log(`Match ${matchNum}: ${player1.name} gets BYE → Round 2 Match ${nextRoundMatch} ${feedsPlayer1 ? 'Player1' : 'Player2'}`);
              
              // Create BYE match record
              matches.push({
                ...divisionPayload,
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: player1.id,
                player2_id: null,
                winner_id: player1.id,
                status: 'bye',
              });
              byeMatchCount++;
            } else if (!player1 && player2) {
              // Player 2 gets BYE
              round2Advances.set(slotKey, player2.id);
              console.log(`Match ${matchNum}: ${player2.name} gets BYE → Round 2 Match ${nextRoundMatch} ${feedsPlayer1 ? 'Player1' : 'Player2'}`);
              
              // Create BYE match record
              matches.push({
                ...divisionPayload,
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: null,
                player2_id: player2.id,
                winner_id: player2.id,
                status: 'bye',
              });
              byeMatchCount++;
            } else if (!player1 && !player2) {
              // Both BYE
              console.log(`Match ${matchNum}: Both BYE`);
              matches.push({
                ...divisionPayload,
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: null,
                player2_id: null,
                status: 'bye',
              });
              byeMatchCount++;
            } else if (player1 && player2) {
              // Normal match
              matches.push({
                ...divisionPayload,
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: player1.id,
                player2_id: player2.id,
                status: 'upcoming',
              });
            }
          } else if (round === 2) {
            // Round 2: check if any players auto-advanced from Round 1
            const matchNum = i + 1;
            const player1Key = `${matchNum}-1`;
            const player2Key = `${matchNum}-2`;
            
            const player1Id = round2Advances.get(player1Key) || null;
            const player2Id = round2Advances.get(player2Key) || null;
            
            if (player1Id || player2Id) {
              console.log(`Round 2 Match ${matchNum}: Player1=${player1Id ? 'Advanced' : 'TBD'}, Player2=${player2Id ? 'Advanced' : 'TBD'}`);
            }
            
            matches.push({
              ...divisionPayload,
              event_id: eventId,
              round: round,
              match_number: matchNum,
              player1_id: player1Id,
              player2_id: player2Id,
              status: 'upcoming',
            });
          } else {
            // Later rounds: empty matches
            matches.push({
              ...divisionPayload,
              event_id: eventId,
              round: round,
              match_number: i + 1,
              status: 'upcoming',
            });
          }
        }
        matchesInRound = matchesInRound / 2;
      }
      
      console.log(`\n=== 比賽生成結果 ===`);
      console.log(`總比賽數: ${matches.length}`);
      console.log(`BYE 比賽數: ${byeMatchCount}`);
      console.log(`實際需要打的比賽: ${matches.length - byeMatchCount}`);
      console.log(`Round 2 自動晉級數: ${round2Advances.size}`);

      // Insert all matches
      const { data, error } = await supabase
        .from("matches")
        .insert(matches);

      if (error) {
        toast.error(`錯誤: ${error.message}`);
        setLoading(false);
        return;
      }

      // Get current user for history tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update event with bracket generation info
      const { error: updateError } = await supabase
        .from("events")
        .update({
          bracket_generation_method: 'auto',
          bracket_generated_at: new Date().toISOString(),
          bracket_locked: true, // Auto-lock generated brackets
        })
        .eq("id", eventId);

      if (updateError) {
        console.error("Failed to update event bracket info:", updateError);
      }

      // Record in edit history
      if (user) {
        await supabase
          .from("bracket_edit_history")
          .insert({
            event_id: eventId,
            admin_id: user.id,
            action: 'generate',
            changes: {
              method: 'auto',
              seeding_mode: seedingMode,
              matches_created: matches.length,
              bracket_size: bracketSize,
              rounds: numRounds,
              byes: numByes,
            },
            reason: seedingMode === 'grand_slam'
              ? '自動生成籤表 (大滿貫對稱抽籤)'
              : '自動生成籤表 (標準固定種子)',
          });
      }

      // Create 3rd place match if enabled (for semifinals losers)
      if (hasThirdPlaceMatch && numRounds >= 2) {
        console.log("\n=== 創建季軍賽 ===");
        
        const thirdPlaceMatch = {
          ...divisionPayload,
          event_id: eventId,
          round: numRounds, // Same round as final
          match_number: 2, // Match number 2 in the final round (Match 1 is the final)
          player1_id: null, // Will be filled when semifinals complete
          player2_id: null, // Will be filled when semifinals complete
          status: "upcoming" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: thirdPlaceError } = await supabase
          .from("matches")
          .insert(thirdPlaceMatch);

        if (thirdPlaceError) {
          console.error("季軍賽創建失敗:", thirdPlaceError);
          toast.error(`季軍賽創建失敗: ${thirdPlaceError.message}`);
        } else {
          console.log("✅ 季軍賽已創建（Match #2）");
          
          // Update event to track this setting
          await supabase
            .from("events")
            .update({ has_third_place_match: true })
            .eq("id", eventId);
        }
      }

      const totalMatchesCreated = hasThirdPlaceMatch && numRounds >= 2 
        ? matches.length + 1 
        : matches.length;
      
      toast.success(`成功生成 ${totalMatchesCreated} 場比賽！${hasThirdPlaceMatch ? '（含季軍賽）' : ''}（${numRounds} 輪）前往 Matches 頁面查看。`);
      router.refresh();
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("生成籤表時發生錯誤");
      setLoading(false);
    }
  };

  const hasExistingMatches = async () => {
    let checkQuery = supabase
      .from("matches")
      .select("*", { count: 'exact', head: true })
      .eq("event_id", eventId);
    if (defaultDivisionId) {
      checkQuery = checkQuery.eq("division_id", defaultDivisionId);
    }
    const { count } = await checkQuery;
    return (count || 0) > 0;
  };

  const handleGenerate = async () => {
    const hasMatches = await hasExistingMatches();
    
    if (hasMatches) {
      const confirm = window.confirm(t('admin.generateBracket.confirmDeleteMatches') || "已有比賽存在。是否要刪除現有比賽並重新生成？");
      if (!confirm) return;
      
      // Get current user for history tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      // Delete existing matches
      let deleteQuery = supabase
        .from("matches")
        .delete()
        .eq("event_id", eventId);
      if (defaultDivisionId) {
        deleteQuery = deleteQuery.eq("division_id", defaultDivisionId);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        toast.error(`刪除舊比賽失敗: ${deleteError.message}`);
        return;
      }
      
      // Record deletion in history
      if (user) {
        await supabase
          .from("bracket_edit_history")
          .insert({
            event_id: eventId,
            admin_id: user.id,
            action: 'edit',
            changes: { action: 'delete_all_matches' },
            reason: '刪除現有比賽以重新生成',
          });
      }
    }
    
    generateBracket();
  };

  const bracketSize = players.length >= 2 ? Math.pow(2, Math.ceil(Math.log2(players.length))) : 0;
  const numRounds = bracketSize > 0 ? Math.log2(bracketSize) : 0;
  const numByes = bracketSize - players.length;
  const totalMatches = bracketSize - 1;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
      <h3 className="text-xl font-semibold text-ntu-green mb-4">{t('admin.generateBracket.title')}</h3>
      
      {/* Seeding Mode Toggle */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          {t('admin.generateBracket.seedingModeLabel')}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSeedingMode("strict")}
            className={`p-3 rounded-lg text-left border transition-all ${
              seedingMode === "strict"
                ? "border-ntu-green bg-green-50/60 shadow-sm ring-1 ring-ntu-green"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`font-semibold text-sm ${seedingMode === "strict" ? "text-ntu-green" : "text-gray-800"}`}>
                🎯 {t('admin.generateBracket.strictModeTitle')}
              </span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                seedingMode === "strict" ? "border-ntu-green bg-ntu-green" : "border-gray-300"
              }`}>
                {seedingMode === "strict" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {t('admin.generateBracket.strictModeDesc')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSeedingMode("grand_slam")}
            className={`p-3 rounded-lg text-left border transition-all ${
              seedingMode === "grand_slam"
                ? "border-ntu-green bg-green-50/60 shadow-sm ring-1 ring-ntu-green"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`font-semibold text-sm ${seedingMode === "grand_slam" ? "text-ntu-green" : "text-gray-800"}`}>
                🏆 {t('admin.generateBracket.grandSlamModeTitle')}
              </span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                seedingMode === "grand_slam" ? "border-ntu-green bg-ntu-green" : "border-gray-300"
              }`}>
                {seedingMode === "grand_slam" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {t('admin.generateBracket.grandSlamModeDesc')}
            </p>
          </button>
        </div>

        {/* Dynamic Mode Explanation Callout */}
        {seedingMode === "grand_slam" ? (
          <div className="mt-3.5 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-lg text-xs space-y-1.5">
            <p className="font-semibold text-emerald-950 flex items-center gap-1.5 text-sm">
              <span>{t('admin.generateBracket.grandSlamSummaryTitle')}</span>
            </p>
            <ul className="space-y-1 pl-4 list-disc text-emerald-900 leading-relaxed">
              <li>{t('admin.generateBracket.grandSlamSummary1')}</li>
              <li>{t('admin.generateBracket.grandSlamSummary2')}</li>
              <li>{t('admin.generateBracket.grandSlamSummary3')}</li>
              <li>{t('admin.generateBracket.grandSlamSummary4')}</li>
            </ul>
          </div>
        ) : (
          <div className="mt-3.5 p-3.5 bg-white border border-gray-200 rounded-lg text-xs space-y-1.5">
            <p className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm">
              <span>{t('admin.generateBracket.strictSummaryTitle')}</span>
            </p>
            <ul className="space-y-1 pl-4 list-disc text-gray-700 leading-relaxed">
              <li>{t('admin.generateBracket.strictSummary1')}</li>
              <li>{t('admin.generateBracket.strictSummary2')}</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-gray-700 mb-2">
            {t('admin.generateBracket.currentPlayers', { n: players.length })}
            {players.filter(p => p.seed).length > 0 && (
              <span className="text-ntu-green font-medium">
                {t('admin.generateBracket.includingSeeds', { n: players.filter(p => p.seed).length })}
              </span>
            )}
          </p>
          {players.length >= 2 ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p>✓ {t('admin.generateBracket.bracketSize', { size: bracketSize, rounds: numRounds })}</p>
              <p>✓ {t('admin.generateBracket.totalMatches', { matches: totalMatches })}</p>
              {numByes > 0 && <p>✓ {t('admin.generateBracket.byesCount', { byes: numByes })}</p>}
            </div>
          ) : (
            <p className="text-sm text-red-600">
              {t('admin.manualBracket.minTwoPlayers', { n: players.length })}
            </p>
          )}
          
          {/* Third Place Match Option */}
          {players.length >= 4 && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="thirdPlaceMatch"
                checked={hasThirdPlaceMatch}
                onChange={(e) => setHasThirdPlaceMatch(e.target.checked)}
                className="w-4 h-4 text-ntu-green border-gray-300 rounded focus:ring-ntu-green cursor-pointer"
              />
              <label htmlFor="thirdPlaceMatch" className="text-sm text-gray-700 cursor-pointer hover:text-ntu-green">
                🥉 {t('admin.generateBracket.thirdPlaceMatch')}
              </label>
            </div>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || players.length < 2}
          className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 self-start md:self-auto shrink-0"
        >
          {loading ? t('admin.generateBracket.generating') : `🎾 ${t('admin.generateBracket.generateButton')}`}
        </button>
      </div>
    </div>
  );
}

