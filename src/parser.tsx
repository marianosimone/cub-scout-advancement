import requirementsData from "./assets/requirements.json";
import Papa from "papaparse";

// An adventure for a rank, as loaded from requirements.json.
export interface AdventureRequirements {
  name: string;
  url: string;
  type: "required" | "elective";
  requirements: Record<string, string>;
}

// A single requirement within an adventure, as loaded from requirements.json.
export type RequirementsType = Record<
  string,
  Record<string, AdventureRequirements>
>;

const denNames = [
  "Lion",
  "Tiger",
  "Wolf",
  "Bear",
  "Webelos",
  "Arrow of Light",
] as const;
export type DenName = (typeof denNames)[number];

// Representation of an individual Scout
export interface Scout {
  name: string;
  nextRank: DenName;
  inProgressAdventures: Array<AdventureRequirements>;
  completedAdventures: Array<AdventureRequirements>;
  availableAdventures: Array<AdventureRequirements>;
}

export interface Den {
  name: DenName;
  scouts: ReadonlyArray<Scout>;
}

export const loadRequirements = (): RequirementsType => {
  const raw = requirementsData as Record<
    string,
    Record<string, Omit<AdventureRequirements, "name">>
  >;
  const normalized: RequirementsType = {};
  for (const [rank, advs] of Object.entries(raw)) {
    normalized[rank] = {};
    for (const [advName, advObj] of Object.entries(advs)) {
      normalized[rank][advName] = {
        name: advName,
        ...advObj,
      };
    }
  }
  return normalized;
};

// --- Parser Constants & Helpers ---
const RANK_VERSION_RE = /^(.+?)\s+v(\d{4})$/i;
const REQUIREMENT_NUM_RE = /^\s*(\d+[a-z]?)\s*[.)]?\s*/;

const COMPLETED_MARKERS = new Set(["completed", "Approved", "ApprovedAwarded"]);
const INCOMPLETE_MARKERS = new Set(["In Progress", "Not Started", "Awarded"]);
const ADVENTURE_AWARDED_MARKERS = new Set([
  "Awarded",
  "Approved",
  "Completed",
  "ApprovedAwarded",
  "CompletedAwarded",
]);

const _normalize_rank_header = (
  label: string,
  jsonRanks: Set<string>,
): string | null => {
  const s = label.trim();
  if (!s) return null;

  // STRICT: Reject any label containing parentheses (e.g. adventure headers like "Summertime Fun (Webelos)")
  if (s.includes("(") || s.includes(")")) {
    return null;
  }

  for (const jr of jsonRanks) {
    if (jr.toLowerCase() === s.toLowerCase()) return jr;
  }

  const m = s.match(RANK_VERSION_RE);
  if (m) {
    const base = m[1].trim();
    for (const jr of jsonRanks) {
      if (jr.toLowerCase() === base.toLowerCase()) return jr;
    }
  }

  return null;
};

const _find_adventure_for_label = (
  label: string,
  adventuresByRank: Record<string, Array<AdventureRequirements>>,
  currentRank: string | null,
): [string, AdventureRequirements] | null => {
  const trimmed = label.trim();
  if (REQUIREMENT_NUM_RE.test(trimmed)) {
    return null;
  }

  const cleanedLabel = trimmed.replace(/^\s*\d+[a-z]?\.\s*/i, "");

  if (currentRank && adventuresByRank[currentRank]) {
    for (const adv of adventuresByRank[currentRank]) {
      if (adv.name.toLowerCase() === cleanedLabel.toLowerCase()) {
        return [currentRank, adv];
      }
    }
  }

  for (const [rank, adventures] of Object.entries(adventuresByRank)) {
    for (const adv of adventures) {
      if (adv.name.toLowerCase() === cleanedLabel.toLowerCase()) {
        return [rank, adv];
      }
    }
  }

  return null;
};

const fixAdvancementReport = (csv: string): string => {
  let fixed = "";
  let inQuotedField = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];

    if (!inQuotedField) {
      fixed += char;
      if (char === '"') inQuotedField = true;
      continue;
    }

    if (char !== '"') {
      fixed += char;
      continue;
    }

    const next = csv[i + 1];

    if (next === '"') {
      fixed += '""';
      i++;
    } else if (
      next === "," ||
      next === "\n" ||
      next === "\r" ||
      next === undefined
    ) {
      fixed += '"';
      inQuotedField = false;
    } else {
      fixed += '""';
    }
  }

  return fixed;
};

export const loadAdvancement = async (
  advancementReportContent: string,
): Promise<string[][]> => {
  const { data: rows, errors } = Papa.parse<string[]>(
    fixAdvancementReport(advancementReportContent),
    {
      header: false,
      skipEmptyLines: false,
      delimiter: ",",
      quoteChar: '"',
    },
  );
  if (errors.length > 0) {
    throw new Error(`CSV parsing failed: ${errors[0].message}`);
  }

  if (rows.length < 3) {
    throw new Error("The CSV file is too short or empty.");
  }

  return rows;
};

export const parseAdvancement = async (
  advancementReport: string[][],
): Promise<Array<Scout>> => {
  const reqsData = loadRequirements();
  const jsonRanks = new Set(Object.keys(reqsData));

  const adventuresByRank: Record<string, Array<AdventureRequirements>> = {};
  for (const [rank, advMap] of Object.entries(reqsData)) {
    adventuresByRank[rank] = Object.values(advMap);
  }

  const scoutNames = (advancementReport[0] || [])
    .map((c) => String(c).trim())
    .slice(1);
  const nextRanks = (advancementReport[1] || [])
    .map((c) => String(c).trim())
    .slice(1);

  const scouts: Array<Scout> = scoutNames.map((name, idx) => {
    const rawRank = nextRanks[idx] || "Arrow of Light";
    const normalizedRank = (_normalize_rank_header(rawRank, jsonRanks) ||
      rawRank) as DenName;
    return {
      name,
      nextRank: normalizedRank,
      inProgressAdventures: [],
      availableAdventures: [],
      completedAdventures: [],
    };
  });

  const completion: Record<string, Record<string, Record<string, string>>> = {};
  const adventureApproved: Record<string, Record<string, boolean>> = {};

  scouts.forEach((scout) => {
    completion[scout.name] = {};
    adventureApproved[scout.name] = {};
    const rankAdventures = adventuresByRank[scout.nextRank] || [];
    rankAdventures.forEach((adv) => {
      completion[scout.name][adv.name] = {};
      adventureApproved[scout.name][adv.name] = false;
      Object.keys(adv.requirements || {}).forEach((reqId) => {
        completion[scout.name][adv.name][reqId] = "incomplete";
      });
    });
  });

  let currentRank: string | null = null;
  let currentAdventure: AdventureRequirements | null = null;

  // Walk rows from index 3 onward
  for (let rIdx = 3; rIdx < advancementReport.length; rIdx++) {
    const row = advancementReport[rIdx];
    if (!row || row.length === 0) continue;
    const firstCol = String(row[0] || "").trim();

    if (!firstCol) continue;

    // Handle dot-preceded resource/description lines
    if (firstCol.startsWith(".")) {
      if (currentAdventure) {
        for (let i = 1; i < Math.min(row.length, scoutNames.length + 1); i++) {
          const scoutName = scoutNames[i - 1];
          if (!scoutName) continue;

          const cell = String(row[i] || "").trim();
          if (
            ADVENTURE_AWARDED_MARKERS.has(cell) ||
            COMPLETED_MARKERS.has(cell)
          ) {
            if (!adventureApproved[scoutName])
              adventureApproved[scoutName] = {};
            adventureApproved[scoutName][currentAdventure.name] = true;

            if (completion[scoutName]?.[currentAdventure.name]) {
              for (const reqId of Object.keys(
                completion[scoutName][currentAdventure.name],
              )) {
                completion[scoutName][currentAdventure.name][reqId] =
                  "completed";
              }
            }
          }
        }
      }
      continue;
    }

    const rankHeaderMatch = _normalize_rank_header(firstCol, jsonRanks);
    if (rankHeaderMatch) {
      currentRank = rankHeaderMatch;
      currentAdventure = null;
      continue;
    }

    const match = _find_adventure_for_label(
      firstCol,
      adventuresByRank,
      currentRank,
    );
    if (match) {
      const [matchedRank, matchedAdv] = match;
      currentRank = matchedRank;
      currentAdventure = matchedAdv;

      for (let i = 1; i < Math.min(row.length, scoutNames.length + 1); i++) {
        const scoutName = scoutNames[i - 1];
        if (!scoutName) continue;

        const cell = String(row[i] || "").trim();
        if (ADVENTURE_AWARDED_MARKERS.has(cell)) {
          if (!adventureApproved[scoutName]) adventureApproved[scoutName] = {};
          adventureApproved[scoutName][currentAdventure.name] = true;

          if (completion[scoutName]?.[currentAdventure.name]) {
            for (const reqId of Object.keys(
              completion[scoutName][currentAdventure.name],
            )) {
              completion[scoutName][currentAdventure.name][reqId] = "completed";
            }
          }
        }
      }
      continue;
    }

    const numMatch = firstCol.match(REQUIREMENT_NUM_RE);
    if (numMatch && currentAdventure) {
      const csvReqId = numMatch[1];
      const validReqIds = Object.keys(currentAdventure.requirements || {});

      if (!validReqIds.includes(csvReqId)) {
        continue;
      }

      for (let i = 1; i < Math.min(row.length, scoutNames.length + 1); i++) {
        const scoutName = scoutNames[i - 1];
        if (!scoutName) continue;

        if (!completion[scoutName]) completion[scoutName] = {};
        if (!completion[scoutName][currentAdventure.name]) {
          completion[scoutName][currentAdventure.name] = {};
        }

        const cell = String(row[i] || "").trim();
        if (COMPLETED_MARKERS.has(cell)) {
          completion[scoutName][currentAdventure.name][csvReqId] = "completed";
        } else if (
          (INCOMPLETE_MARKERS.has(cell) || cell === "") &&
          completion[scoutName][currentAdventure.name][csvReqId] !== "completed"
        ) {
          completion[scoutName][currentAdventure.name][csvReqId] = "incomplete";
        }
      }
      continue;
    }
  }

  // Finalize finished vs pending per scout
  scouts.forEach((scout) => {
    const rankAdventures = adventuresByRank[scout.nextRank] || [];
    rankAdventures.forEach((adv) => {
      const reqStatus = completion[scout.name]?.[adv.name] || {};
      const reqKeys = Object.keys(adv.requirements || {});
      const completedCount = reqKeys.filter(
        (k) => reqStatus[k] === "completed",
      ).length;
      const isApproved = adventureApproved[scout.name]?.[adv.name] || false;
      const allDone =
        isApproved || (reqKeys.length > 0 && completedCount === reqKeys.length);

      const inProgress =
        !allDone && (adv.type === "required" || completedCount > 0);

      if (allDone) {
        scout.completedAdventures.push(adv);
      } else if (inProgress) {
        const inProgressAdventure = {
          name: adv.name,
          url: adv.url,
          type: adv.type,
          requirements: Object.fromEntries(
            Object.entries(adv.requirements).filter(
              ([key]) => reqStatus[key] !== "completed",
            ),
          ),
        };
        scout.inProgressAdventures.push(inProgressAdventure);
      } else {
        scout.availableAdventures.push(adv);
      }
    });
  });

  return scouts;
};
