"use client";

import { Player, Match } from "@/types/tournament";
import { useState } from "react";

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

  // Calculate dynamic values based on actual data
  const maxRound = Math.max(...matches.map(m => m.round), 1);
  const firstRoundMatches = matches.filter(m => m.round === 1).length;
  const bracketSize = firstRoundMatches * 2;
  const totalPlayers = players.length;
  const numSeeds = players.filter(p => p.seed).length;

  // Check if there's a 3rd place match
  const finalRoundMatches = matches.filter(m => m.round === maxRound);
  const has3rdPlaceMatch = finalRoundMatches.length > 1;

  // Determine number of sections based on bracket size
  // For 64 players: 5 sections (4 quarters + finals)
  // For 32 players: 3 sections (2 halves + finals)
  // For 16 players or less: 1 section (all matches)
  
  const getSectionInfo = () => {
    if (bracketSize >= 64) {
      // 5 sections for 64+ players
      return {
        totalSections: 5,
        sectionNames: ["第1區", "第2區", "第3區", "第4區", "決賽階段"],
        roundsPerSection: [
          [1, 2, 3, 4], // Section 1: Rounds 1-4 (positions 1-16)
          [1, 2, 3, 4], // Section 2: Rounds 1-4 (positions 17-32)
          [1, 2, 3, 4], // Section 3: Rounds 1-4 (positions 33-48)
          [1, 2, 3, 4], // Section 4: Rounds 1-4 (positions 49-64)
          [5, 6],       // Section 5: QF, SF, Final, 3rd Place
        ],
      };
    } else if (bracketSize >= 32) {
      // 3 sections for 32 players
      return {
        totalSections: 3,
        sectionNames: ["上半區", "下半區", "決賽階段"],
        roundsPerSection: [
          [1, 2, 3], // Section 1: Rounds 1-3 (positions 1-16)
          [1, 2, 3], // Section 2: Rounds 1-3 (positions 17-32)
          [4, 5],    // Section 3: QF, SF, Final, 3rd Place
        ],
      };
    } else {
      // 1 section for small brackets
      return {
        totalSections: 1,
        sectionNames: ["完整籤表"],
        roundsPerSection: [Array.from({ length: maxRound }, (_, i) => i + 1)],
      };
    }
  };

  const sectionInfo = getSectionInfo();

  // Get matches for current section
  const getMatchesForSection = (sectionNumber: number) => {
    if (sectionNumber === sectionInfo.totalSections) {
      // Last section: Finals stage (QF, SF, Final, 3rd Place)
      const finalsRounds = sectionInfo.roundsPerSection[sectionNumber - 1];
      return matches.filter(m => finalsRounds.includes(m.round));
    } else {
      // Quarter sections: divide first round matches
      const round1Matches = matches.filter(m => m.round === 1).sort((a, b) => a.matchNumber - b.matchNumber);
      const matchesPerQuarter = Math.ceil(round1Matches.length / (sectionInfo.totalSections - 1));
      
      const startIdx = (sectionNumber - 1) * matchesPerQuarter;
      const endIdx = sectionNumber * matchesPerQuarter;
      
      const sectionRound1Matches = round1Matches.slice(startIdx, endIdx);
      const sectionRound1MatchNumbers = sectionRound1Matches.map(m => m.matchNumber);
      
      // Get all matches that are descendants of these Round 1 matches
      const getSectionMatches = (matchNumbers: number[], round: number): number[] => {
        if (round >= maxRound - 1) return matchNumbers; // Stop before finals
        
        const nextRoundNumbers = matchNumbers.map(n => Math.ceil(n / 2));
        return [...matchNumbers, ...getSectionMatches(nextRoundNumbers, round + 1)];
      };
      
      const allMatchNumbers = getSectionMatches(sectionRound1MatchNumbers, 1);
      
      // Get matches for rounds in this section
      const targetRounds = sectionInfo.roundsPerSection[sectionNumber - 1];
      return matches.filter(m => 
        targetRounds.includes(m.round) && allMatchNumbers.includes(m.matchNumber)
      );
    }
  };

  const currentMatches = getMatchesForSection(currentSection);

  return (
    <div>
      {/* Section Tabs */}
      {sectionInfo.totalSections > 1 && (
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: sectionInfo.totalSections }, (_, i) => i + 1).map((section) => (
              <button
                key={section}
                onClick={() => setCurrentSection(section)}
                className={`px-6 py-3 font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                  currentSection === section
                    ? "bg-ntu-green text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {sectionInfo.sectionNames[section - 1]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
        <p className="text-sm text-blue-800">
          <strong>{sectionInfo.sectionNames[currentSection - 1]}</strong>
          {currentSection === sectionInfo.totalSections 
            ? " - 八強、準決賽、決賽" + (has3rdPlaceMatch ? "、季軍賽" : "")
            : ` - ${currentMatches.length} 場比賽`
          }
        </p>
      </div>

      {/* Bracket Display */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-ntu-green mb-2">
            {sportName} Tournament Bracket
          </h2>
          <p className="text-sm text-gray-600">
            {sectionInfo.sectionNames[currentSection - 1]} • {currentMatches.length} matches
          </p>
        </div>

        {/* Import the actual bracket display component */}
        <div className="text-center text-gray-500 py-12">
          <p>Bracket visualization for section {currentSection} will be displayed here</p>
          <p className="text-sm mt-2">({currentMatches.length} matches)</p>
        </div>
      </div>
    </div>
  );
}

