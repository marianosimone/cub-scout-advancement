import "./App.css";
import { loadRequirements, loadAdvancement, parseAdvancement } from "./parser";
import type { AdventureRequirements, Scout } from "./parser";
import { useRef, useState } from "react";
import type { JSX } from "react";
import QRCode from "react-qr-code";

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

// Helper to derive adventure image filename
const getAdventureImageFilename = (rank: string, advName: string): string => {
  const cleanRankName = rank.toLowerCase().trim().replaceAll(" ", "-");
  const cleanName = advName
    .replace(/\s*\([^)]+\)\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return new URL(
    `./assets/img/${cleanRankName}/${cleanName}.png`,
    import.meta.url,
  ).href;
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

  const AdventureTitle = ({
    rank,
    adventure,
  }: {
    rank: string;
    adventure: AdventureRequirements;
  }): JSX.Element => {
    const advImgPath = getAdventureImageFilename(rank, adventure.name);
    return (
      <div
        style={{
          fontWeight: "bold",
          marginBottom: "0.4em",
          display: "flex",
          alignItems: "center", // Vertically centers the image and text
          justifyContent: "flex-start", // Aligns all content to the left
          gap: "0.5em",
        }}
      >
        <img
          src={advImgPath}
          alt=""
          style={{
            width: "36px",
            height: "36px",
            objectFit: "contain",
            flexShrink: 0, // Prevents the image from squishing if text wraps
          }}
        />
        <span style={{ fontSize: "1.05rem", textAlign: "left" }}>
          {adventure.name}
        </span>
      </div>
    );
  };

  const AdventureQRCode = ({
    adventure,
  }: {
    adventure: AdventureRequirements;
  }): JSX.Element => {
    return (
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
          data-url={adventure.url}
          style={{
            width: "60px",
            height: "60px",
          }}
        >
          <QRCode
            value={adventure.url}
            size={60}
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
        <a
          href={adventure.url}
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
    );
  };

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
          const denLogoPath = new URL(
            `./assets/img/logos/${denLogoKey}.png`,
            import.meta.url,
          ).href;

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
                        {scout.inProgressAdventures.length === 0 ? (
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
                            {scout.inProgressAdventures.map((adv, aIdx) => {
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
                                    <AdventureTitle
                                      rank={rank}
                                      adventure={adv}
                                    />

                                    {
                                      <div
                                        style={{
                                          margin: "0 0 6px 0",
                                          fontSize: "0.85rem",
                                          color: "#4a5568",
                                        }}
                                      >
                                        {Object.entries(adv.requirements).map(
                                          (req) => (
                                            <div
                                              key={req[0]}
                                              style={{
                                                color: "#2d3748",
                                                marginBottom: "3px",
                                              }}
                                            >
                                              <strong>{req[0]}.</strong>{" "}
                                              {req[1]}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    }
                                  </div>

                                  <AdventureQRCode adventure={adv} />
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
                        {scout.availableAdventures.length === 0 ? (
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
                            {scout.availableAdventures.map((adv, aIdx) => {
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
                                    alignItems: "stretch", // Lets children span the full width of the card
                                    justifyContent: "space-between",
                                    gap: "10px",
                                  }}
                                >
                                  <AdventureTitle rank={rank} adventure={adv} />

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <AdventureQRCode adventure={adv} />
                                  </div>
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
                        {scout.completedAdventures.length === 0 ? (
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
                            {scout.completedAdventures.map((adv, aIdx) => {
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
                                  <AdventureTitle rank={rank} adventure={adv} />
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
