import "./App.css";
import { loadRequirements, loadAdvancement, parseAdvancement } from "./parser";
import type { Scout } from "./parser";
import { useRef, useState, useEffect } from "react";

// Declare QRCode global from CDN script if loaded in index.html
declare const QRCode: any;

interface CsvLoaderButtonProps {
  onFileLoaded: (csvText: string) => void;
  buttonText?: string;
}

const CsvLoaderButton = ({
  onFileLoaded,
  buttonText = "Load CSV File",
}: CsvLoaderButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        onFileLoaded(text);
      }
    };
    reader.readAsText(file);

    event.target.value = "";
  };

  return (
    <>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button onClick={handleButtonClick} className="load-btn">
        {buttonText}
      </button>
    </>
  );
};

// Helper to derive den logo filename
const getDenLogoName = (rankName: string) => {
  return rankName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

// Helper to derive den plural folder for adventure images
const getDenPluralFolder = (rankName: string) => {
  const lower = rankName.toLowerCase().trim();
  if (lower.includes("lion")) return "lions";
  if (lower.includes("tiger")) return "tigers";
  if (lower.includes("wolf")) return "wolves";
  if (lower.includes("bear")) return "bears";
  if (lower.includes("webelos")) return "webelos";
  if (lower.includes("arrow of light") || lower.includes("aol")) return "aols";
  return lower.replace(/[^a-z0-9]+/g, "");
};

// Helper to derive adventure image filename
const getAdventureImageFilename = (den: string, advName: string): string => {
  const cleanName = advName
    .replace(/\s*\([^)]+\)\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return new URL(`./assets/img/${den}/${cleanName}.png`, import.meta.url).href;
};

export default function App() {
  const [scouts, setScouts] = useState<Scout[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileLoaded = async (csvText: string) => {
    try {
      setLoading(true);
      setError(null);
      const rows = await loadAdvancement(csvText);
      const parsedScouts = await parseAdvancement(rows);
      setScouts(parsedScouts);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse advancement report.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScouts(null);
    setError(null);
  };

  // Automatically generate QR codes whenever scouts state updates and DOM is rendered
  useEffect(() => {
    if (!scouts) return;
    const timer = setTimeout(() => {
      const qrContainers = document.querySelectorAll('[id^="qr-"]');
      qrContainers.forEach((container) => {
        const url = container.getAttribute("data-url");
        if (
          url &&
          typeof QRCode !== "undefined" &&
          container.childElementCount === 0
        ) {
          try {
            new QRCode(container, {
              text: url,
              width: 60,
              height: 60,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel?.L || 1,
            });
          } catch (e) {
            console.error("QR Code generation error:", e);
          }
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [scouts]);

  // Group scouts by nextRank (Den)
  const scoutsByDen = scouts
    ? scouts.reduce(
        (acc, scout) => {
          const rank = scout.nextRank || "Unknown";
          if (!acc[rank]) acc[rank] = [];
          acc[rank].push(scout);
          return acc;
        },
        {} as Record<string, Scout[]>,
      )
    : {};

  const requirements = loadRequirements();

  // Clean base URL handling for Vite sub-paths
  const rawBase = import.meta.env.BASE_URL || "/";
  const baseUrl = rawBase.endsWith("/") ? rawBase : rawBase + "/";

  let qrCounter = 0;

  return (
    <div
      className="app-container"
      style={{
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1>⚜️ Cub Scout Advancement Reporting</h1>
        <p style={{ color: "#666" }}>
          Choose a Scoutbook-generated CSV file below to generate your
          advancement reports.
        </p>
      </header>

      {!scouts && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <CsvLoaderButton
            onFileLoaded={handleFileLoaded}
            buttonText="Select Scoutbook CSV Report"
          />
          {loading && (
            <p style={{ marginTop: "1rem", color: "#3182ce" }}>
              Processing advancement report...
            </p>
          )}
          {error && (
            <p style={{ marginTop: "1rem", color: "red" }}>Error: {error}</p>
          )}
        </div>
      )}

      {scouts && (
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <button
            onClick={handleReset}
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Upload Another Report
          </button>
          <p style={{ marginTop: "0.5rem", fontWeight: "bold" }}>
            {scouts.length} Scouts analyzed successfully.
          </p>
        </div>
      )}

      {scouts &&
        Object.entries(scoutsByDen).map(([rank, denScouts]) => {
          const denLogoKey = getDenLogoName(rank);
          const denFolder = getDenPluralFolder(rank);
          const denLogoPath = `${baseUrl}assets/img/logos/${denLogoKey}.png`;
          const denAdventures = Object.values(requirements[rank] || {});

          return (
            <section key={rank} style={{ marginBottom: "2.5rem" }}>
              <h2
                style={{
                  color: "var(--primary, #2b6cb0)",
                  borderBottom: "2px solid #e2e8f0",
                  paddingBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <img
                  src={denLogoPath}
                  alt={rank}
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "contain",
                  }}
                  onError={(e: any) => {
                    e.target.style.display = "none";
                  }}
                />
                Den / Rank: {rank} ({denScouts.length} scouts)
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  marginTop: "1rem",
                }}
              >
                {denScouts.map((scout, sIdx) => {
                  const finishedNames = new Set(
                    scout.finishedAdventures.map((a) => a.name),
                  );
                  const pendingNames = new Set(
                    scout.pendingAdventures.map((a) => a.name),
                  );
                  const availableElectives = denAdventures.filter(
                    (adv) =>
                      adv.type === "elective" &&
                      !finishedNames.has(adv.name) &&
                      !pendingNames.has(adv.name),
                  );

                  return (
                    <div
                      key={sIdx}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e0",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          borderBottom: "2px solid var(--primary, #2b6cb0)",
                          paddingBottom: "0.5rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <img
                          src={denLogoPath}
                          alt=""
                          style={{
                            width: "32px",
                            height: "32px",
                            objectFit: "contain",
                          }}
                          onError={(e: any) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.2rem",
                            color: "var(--primary, #2b6cb0)",
                          }}
                        >
                          Scout: {scout.name}{" "}
                          <span
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: "normal",
                              color: "#718096",
                            }}
                          >
                            (Rank: {scout.nextRank})
                          </span>
                        </h3>
                      </div>

                      {/* Pending / In Progress Adventures */}
                      <div style={{ marginBottom: "1.25rem" }}>
                        <h4
                          style={{
                            color: "#333",
                            margin: "0 0 0.5rem 0",
                            fontSize: "1rem",
                            borderBottom: "1px solid #eee",
                            paddingBottom: "3px",
                          }}
                        >
                          ⏳ In Progress
                        </h4>
                        {scout.pendingAdventures.length === 0 ? (
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "#666",
                              fontStyle: "italic",
                              margin: "0 0 1rem 0",
                            }}
                          >
                            No adventures currently in progress.
                          </p>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                              marginBottom: "1rem",
                            }}
                          >
                            {scout.pendingAdventures.map((adv, aIdx) => {
                              const advImgPath = getAdventureImageFilename(
                                denFolder,
                                adv.name,
                              );
                              const incompleteReqs =
                                scout.pendingIncompleteRequirements.get(
                                  adv.name,
                                ) || [];
                              const uniqueQrId = `qr-${sIdx}-${aIdx}-${++qrCounter}`;

                              return (
                                <div
                                  key={aIdx}
                                  style={{
                                    background: "#f8f9fa",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    padding: "0.75rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: "15px",
                                  }}
                                >
                                  <div
                                    style={{ flexGrow: 1, textAlign: "left" }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: "bold",
                                        marginBottom: "0.4rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                      }}
                                    >
                                      <img
                                        src={advImgPath}
                                        alt=""
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          objectFit: "contain",
                                        }}
                                      />
                                      <span style={{ fontSize: "1.05rem" }}>
                                        {adv.name}
                                      </span>
                                    </div>

                                    {incompleteReqs.length > 0 ? (
                                      <div
                                        style={{
                                          margin: "0 0 6px 0",
                                          fontSize: "0.85rem",
                                          color: "#4a5568",
                                        }}
                                      >
                                        {incompleteReqs.map((req) => (
                                          <div
                                            key={req.id}
                                            style={{
                                              color: "#2d3748",
                                              marginBottom: "3px",
                                            }}
                                          >
                                            <strong>{req.id}.</strong>{" "}
                                            {req.text}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p
                                        style={{
                                          fontSize: "0.85rem",
                                          color: "#666",
                                          fontStyle: "italic",
                                          margin: 0,
                                        }}
                                      >
                                        All requirements completed.
                                      </p>
                                    )}
                                  </div>

                                  {adv.url && (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minWidth: "60px",
                                      }}
                                    >
                                      <div
                                        id={uniqueQrId}
                                        data-url={adv.url}
                                        style={{
                                          width: "60px",
                                          height: "60px",
                                        }}
                                      ></div>
                                      <a
                                        href={adv.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "#3182ce",
                                          textDecoration: "none",
                                          marginTop: "3px",
                                          textAlign: "center",
                                        }}
                                      >
                                        See adventure
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Available Electives */}
                      <div style={{ marginBottom: "1.25rem" }}>
                        <h4
                          style={{
                            color: "#333",
                            margin: "0 0 0.5rem 0",
                            fontSize: "1rem",
                            borderBottom: "1px solid #eee",
                            paddingBottom: "3px",
                          }}
                        >
                          📌 Available Electives
                        </h4>
                        {availableElectives.length === 0 ? (
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "#666",
                              fontStyle: "italic",
                              margin: "0 0 1rem 0",
                            }}
                          >
                            No remaining available electives.
                          </p>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(200px, 1fr))",
                              gap: "12px",
                              marginBottom: "1rem",
                            }}
                          >
                            {availableElectives.map((adv, aIdx) => {
                              const advImgPath = getAdventureImageFilename(
                                denFolder,
                                adv.name,
                              );
                              const uniqueQrId = `qr-avail-${sIdx}-${aIdx}-${++qrCounter}`;

                              return (
                                <div
                                  key={aIdx}
                                  style={{
                                    background: "#f8f9fa",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    padding: "12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    textAlign: "center",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      width: "100%",
                                      textAlign: "left",
                                    }}
                                  >
                                    <img
                                      src={advImgPath}
                                      alt=""
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        objectFit: "contain",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        fontSize: "0.9rem",
                                        color: "#2d3748",
                                        lineHeight: "1.2",
                                      }}
                                    >
                                      {adv.name}
                                    </span>
                                  </div>

                                  {adv.url && (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginTop: "4px",
                                      }}
                                    >
                                      <div
                                        id={uniqueQrId}
                                        data-url={adv.url}
                                        style={{
                                          width: "60px",
                                          height: "60px",
                                        }}
                                      ></div>
                                      <a
                                        href={adv.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: "0.65rem",
                                          color: "#3182ce",
                                          textDecoration: "none",
                                          marginTop: "4px",
                                          textAlign: "center",
                                        }}
                                      >
                                        See adventure
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Completed Adventures */}
                      <div>
                        <h4
                          style={{
                            color: "#333",
                            margin: "0 0 0.5rem 0",
                            fontSize: "1rem",
                            borderBottom: "1px solid #eee",
                            paddingBottom: "3px",
                          }}
                        >
                          🎉 Completed
                        </h4>
                        {scout.finishedAdventures.length === 0 ? (
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "#666",
                              fontStyle: "italic",
                              margin: 0,
                            }}
                          >
                            No adventures completed yet.
                          </p>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(200px, 1fr))",
                              gap: "12px",
                            }}
                          >
                            {scout.finishedAdventures.map((adv, aIdx) => {
                              const advImgPath = getAdventureImageFilename(
                                denFolder,
                                adv.name,
                              );

                              return (
                                <div
                                  key={aIdx}
                                  style={{
                                    background: "#f8f9fa",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    padding: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
                                  <img
                                    src={advImgPath}
                                    alt=""
                                    style={{
                                      width: "36px",
                                      height: "36px",
                                      objectFit: "contain",
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      fontSize: "0.9rem",
                                      color: "#2d3748",
                                      lineHeight: "1.2",
                                      textAlign: "left",
                                    }}
                                  >
                                    {adv.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

      {!scouts && (
        <section
          style={{
            marginTop: "3rem",
            background: "#f7fafc",
            padding: "1.5rem",
            borderRadius: "8px",
          }}
        >
          <h3>System Knowledge Base</h3>
          <p style={{ fontSize: "0.9rem", color: "#4a5568" }}>
            This system knows about:
          </p>
          <ul style={{ fontSize: "0.9rem", color: "#4a5568" }}>
            {Object.entries(loadRequirements()).map(([den, adventures]) => (
              <li key={den}>
                {Object.keys(adventures).length} adventures for the {den} Den
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
