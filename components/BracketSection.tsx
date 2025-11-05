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
  
  if (bracketSize >= 64) {
    // 64+ players: 5 sections (4 quarters to R4 + finals)
    const quarter = bracketSize / 4;
    sections = [
      { name: "第1區 (1-16)", startPos: 1, endPos: quarter, rounds: [1, 2, 3, 4] },
      { name: "第2區 (17-32)", startPos: quarter + 1, endPos: quarter * 2, rounds: [1, 2, 3, 4] },
      { name: "第3區 (33-48)", startPos: quarter * 2 + 1, endPos: quarter * 3, rounds: [1, 2, 3, 4] },
      { name: "第4區 (49-64)", startPos: quarter * 3 + 1, endPos: quarter * 4, rounds: [1, 2, 3, 4] },
      { name: "決賽階段", startPos: 1, endPos: bracketSize, rounds: [5, 6] },
    ];
  } else if (bracketSize >= 32) {
    // 32 players: 3 sections (2 halves to R3 + finals)
    const half = bracketSize / 2;
    sections = [
      { name: "上半區 (1-16)", startPos: 1, endPos: half, rounds: [1, 2, 3] },
      { name: "下半區 (17-32)", startPos: half + 1, endPos: bracketSize, rounds: [1, 2, 3] },
      { name: "決賽階段", startPos: 1, endPos: bracketSize, rounds: [4, 5] },
    ];
  } else {
    // Small bracket: single section
    sections = [
      { name: "完整籤表", startPos: 1, endPos: bracketSize, rounds: Array.from({ length: maxRound }, (_, i) => i + 1) },
    ];
  }

  // Get matches for current section
  const currentSectionConfig = sections[currentSection - 1];
  
  const getMatchesForSection = (): Match[] => {
    const { startPos, endPos, rounds } = currentSectionConfig;
    
    return matches.filter(match => {
      // Include if round is in the section's rounds
      if (!rounds.includes(match.round)) return false;
      
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
      
      // Check if match range overlaps with section range
      return matchStartPos <= endPos && matchEndPos >= startPos;
    });
  };

  const sectionMatches = getMatchesForSection();

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

      {/* Bracket Display using existing TournamentBracket component */}
      <TournamentBracket
        matches={sectionMatches}
        players={players}
        sportName={sportName}
      />
    </div>
  );
}
