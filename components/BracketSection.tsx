"use client";

import { Player, Match } from "@/types/tournament";
import { useState } from "react";
import TournamentBracket from "./TournamentBracket";

interface BracketSectionProps {
  matches: Match[];
  players: Player[];
  sportName?: string;
}

export default function BracketSection({
  matches,
  players,
  sportName = "Tennis",
}: BracketSectionProps) {
  const [currentSection, setCurrentSection] = useState(1);

  // Calculate bracket info
  const maxRound = Math.max(...matches.map(m => m.round), 1);
  const round1Matches = matches.filter(m => m.round === 1).sort((a, b) => a.matchNumber - b.matchNumber);
  const bracketSize = round1Matches.length * 2;
  const has3rdPlaceMatch = matches.some(m => m.round === maxRound && m.matchNumber === 2);

  // Determine sections based on bracket size
  let sections: { name: string; startPos: number; endPos: number; rounds: number[] }[] = [];
  
  if (bracketSize > 32) {
    // 64+ players: 5 sections (4 quarters to Round of 16 + finals)
    const quarter = bracketSize / 4;
    const round16 = maxRound - 3; // Round of 16 is 4 rounds before final
    
    sections = [
      { 
        name: `第1區 (1-${quarter})`, 
        startPos: 1, 
        endPos: quarter, 
        rounds: Array.from({ length: round16 }, (_, i) => i + 1) 
      },
      { 
        name: `第2區 (${quarter + 1}-${quarter * 2})`, 
        startPos: quarter + 1, 
        endPos: quarter * 2, 
        rounds: Array.from({ length: round16 }, (_, i) => i + 1) 
      },
      { 
        name: `第3區 (${quarter * 2 + 1}-${quarter * 3})`, 
        startPos: quarter * 2 + 1, 
        endPos: quarter * 3, 
        rounds: Array.from({ length: round16 }, (_, i) => i + 1) 
      },
      { 
        name: `第4區 (${quarter * 3 + 1}-${bracketSize})`, 
        startPos: quarter * 3 + 1, 
        endPos: quarter * 4, 
        rounds: Array.from({ length: round16 }, (_, i) => i + 1) 
      },
      { 
        name: "決賽階段", 
        startPos: 1, 
        endPos: bracketSize, 
        rounds: Array.from({ length: maxRound - round16 }, (_, i) => round16 + i + 1)
      },
    ];
  } else {
    // 32 players or less: show complete bracket
    sections = [
      { 
        name: "完整籤表", 
        startPos: 1, 
        endPos: bracketSize, 
        rounds: Array.from({ length: maxRound }, (_, i) => i + 1) 
      },
    ];
  }

  // Get matches for current section
  const currentSectionConfig = sections[currentSection - 1];
  
  const getMatchesForSection = (): Match[] => {
    const { startPos, endPos, rounds } = currentSectionConfig;
    const isFinalsSection = currentSection === sections.length;
    
    return matches.filter(match => {
      // FIRST: Check if this is the 3rd place match (matchNumber === 2 in final round)
      const isThirdPlaceMatch = match.round === maxRound && match.matchNumber === 2;
      
      // 3rd place match should ONLY appear in the finals section
      if (isThirdPlaceMatch) {
        return isFinalsSection;
      }
      
      // Include if round is in the section's rounds
      if (!rounds.includes(match.round)) return false;
      
      // For finals section, include ALL matches in the specified rounds (no position filtering)
      if (isFinalsSection) {
        return true;
      }
      
      // For early sections, apply position filtering
      // For Round 1, check position range directly
      if (match.round === 1) {
        const position1 = (match.matchNumber - 1) * 2 + 1;
        const position2 = (match.matchNumber - 1) * 2 + 2;
        return (position1 >= startPos && position1 <= endPos) || 
               (position2 >= startPos && position2 <= endPos);
      }
      
      // For later rounds, check if match's "coverage" overlaps with section
      const playersPerMatch = Math.pow(2, match.round);
      const matchStartPos = (match.matchNumber - 1) * playersPerMatch + 1;
      const matchEndPos = match.matchNumber * playersPerMatch;
      
      // Check if match range overlaps with section range (any overlap counts)
      const hasOverlap = matchStartPos <= endPos && matchEndPos >= startPos;
      
      return hasOverlap;
    });
  };

  const sectionMatches = getMatchesForSection();
  
  // Get section-specific players (only players that appear in this section's Round 1)
  const getSectionPlayers = (): Player[] => {
    if (sections.length === 1) return players;
    
    if (currentSection === sections.length) {
      // Finals: return all players (they might be referenced)
      return players;
    }
    
    // Get players from Round 1 matches in this section
    const round1InSection = sectionMatches.filter(m => m.round === 1);
    const playerIds = new Set<string>();
    
    round1InSection.forEach(match => {
      if (match.player1?.id) playerIds.add(match.player1.id);
      if (match.player2?.id) playerIds.add(match.player2.id);
    });
    
    return players.filter(p => playerIds.has(p.id));
  };
  
  const sectionPlayers = getSectionPlayers();

  return (
    <div>
      {/* Section Tabs */}
      {sections.length > 1 && (
        <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto">
            {sections.map((section, idx) => (
              <button
                key={idx + 1}
                onClick={() => setCurrentSection(idx + 1)}
                className={`flex-1 min-w-[140px] px-6 py-4 font-semibold transition-colors border-b-4 ${
                  currentSection === idx + 1
                    ? "bg-ntu-green text-white border-ntu-green"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-transparent"
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section Info Banner */}
      {sections.length > 1 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              正在查看：<strong>{currentSectionConfig.name}</strong>
              {currentSection === sections.length
                ? ` - 包含八強、準決賽、決賽${has3rdPlaceMatch ? "和季軍賽" : ""}`
                : ` - 包含 ${sectionMatches.length} 場比賽`
              }
            </p>
          </div>
        </div>
      )}

      {/* Bracket Display */}
      {currentSection === sections.length ? (
        <FinalsStage 
          matches={sectionMatches}
          players={players}
          sportName={sportName}
          totalRounds={maxRound}
          compactLayout={true}
        />
      ) : (
        <SectionBracket
          matches={sectionMatches}
          players={sectionPlayers}
          sportName={sportName}
          sectionNumber={currentSection}
          totalRounds={maxRound}
        />
      )}
    </div>
  );
}

// Component for displaying early round sections (quarters)
function SectionBracket({ 
  matches, 
  players, 
  sportName,
  sectionNumber,
  totalRounds 
}: { 
  matches: Match[]; 
  players: Player[]; 
  sportName: string;
  sectionNumber: number;
  totalRounds: number;
}) {
  // Re-map match numbers for ALL rounds to start from 1
  const remappedMatches = matches.map((match) => {
    // Get all matches in the same round, sorted by matchNumber
    const roundMatches = matches
      .filter(m => m.round === match.round)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    
    // Find the index of current match in this round and add 1 (to start from 1, not 0)
    const newMatchNumber = roundMatches.findIndex(m => m.matchNumber === match.matchNumber) + 1;
    
    return { ...match, matchNumber: newMatchNumber };
  });
  
  // Use original TournamentBracket with re-mapped matches
  // Hide 3rd place match in section brackets (it will be shown separately in finals)
  return (
    <TournamentBracket
      matches={remappedMatches}
      players={players}
      sportName={sportName}
      totalRounds={totalRounds}
      hideThirdPlace={true}
    />
  );
}

// Component for displaying finals stage (compact layout)
function FinalsStage({ 
  matches, 
  players, 
  sportName,
  totalRounds,
  compactLayout = false
}: { 
  matches: Match[]; 
  players: Player[]; 
  sportName: string;
  totalRounds: number;
  compactLayout?: boolean;
}) {
  // Re-number matches to start from 1 for each round (keep 3rd place match in main bracket)
  const remappedMatches = matches.map(match => {
    const roundMatches = matches.filter(m => m.round === match.round).sort((a, b) => a.matchNumber - b.matchNumber);
    const newMatchNumber = roundMatches.findIndex(m => m.matchNumber === match.matchNumber) + 1;
    return { ...match, matchNumber: newMatchNumber };
  });

  return (
    <TournamentBracket
      matches={remappedMatches}
      players={players}
      sportName={sportName}
      totalRounds={totalRounds}
      compactLayout={compactLayout}
      hideThirdPlace={false}
    />
  );
}

