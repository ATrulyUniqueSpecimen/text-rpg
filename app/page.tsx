"use client";

import { useEffect, useState } from "react";
import { Story } from "inkjs";

const SAVE_KEYS = ["ink_save_1", "ink_save_2", "ink_save_3"] as const;
const ACTIVE_SLOT_KEY = "ink_active_slot";

type ChoiceView = { index: number; text: string };

type Mode = "menu" | "game";

export default function Page() {
  type Mode = "menu" | "stats" | "game";

  const [uiCoins, setUiCoins] = useState<number>(0);
  const [uiInventory, setUiInventory] = useState<string[]>([]);

  const [mode, setMode] = useState<Mode>("menu");
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  const [stats, setStats] = useState({ STR: 5, CHA: 5, WIT: 5 });
  const STAT_POOL = 15; // example, change as you like

  const [storyJson, setStoryJson] = useState<any | null>(null);
  const [story, setStory] = useState<Story | null>(null);

  const [lines, setLines] = useState<string[]>([]);
  const [choices, setChoices] = useState<ChoiceView[]>([]);

  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [slotHasSave, setSlotHasSave] = useState<boolean[]>([false, false, false]);

  function readSlotPresence(): boolean[] {
    return SAVE_KEYS.map(k => !!localStorage.getItem(k));
  }

  function refreshSlotPresence() {
    setSlotHasSave(readSlotPresence());
  }

  function saveToSlot(s: Story, slot: number) {
    localStorage.setItem(SAVE_KEYS[slot], s.state.toJson());
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
    refreshSlotPresence();
  }

  function loadFromSlot(s: Story, slot: number): boolean {
    const saved = localStorage.getItem(SAVE_KEYS[slot]);
    if (!saved) return false;
    try {
      s.state.LoadJson(saved);
      return true;
    } catch {
      localStorage.removeItem(SAVE_KEYS[slot]);
      refreshSlotPresence();
      return false;
    }
  }

  function clearSlot(slot: number) {
    localStorage.removeItem(SAVE_KEYS[slot]);
    refreshSlotPresence();
  }

  function buildUIFromStory(s: Story, resetTranscript: boolean) {
    const newLines: string[] = [];
    while (s.canContinue) {
      const t = (s as any).Continue().trim();
      if (t) newLines.push(t);
    }

    if (resetTranscript) setLines(newLines);
    else if (newLines.length) setLines(prev => [...prev, ...newLines]);

    setChoices(s.currentChoices.map(c => ({ index: c.index, text: c.text })));
    
    syncSidebar(s);
  }

  function startFreshInSlot(slot: number, chosenStats: { STR: number; CHA: number; WIT: number }) {
    if (!storyJson) return;

    const s = new Story(storyJson);

    // Set Ink globals before any Continue()
    s.variablesState["STR"] = chosenStats.STR;
    s.variablesState["CHA"] = chosenStats.CHA;
    s.variablesState["WIT"] = chosenStats.WIT;

    setStory(s);
    setActiveSlot(slot);

    setLines([]);
    setChoices([]);

    buildUIFromStory(s, true);
    saveToSlot(s, slot);

    setMode("game");
  }

  function StatEditor({
    stats,
    setStats,
    pool,
  }: {
    stats: { STR: number; CHA: number; WIT: number };
    setStats: (s: { STR: number; CHA: number; WIT: number }) => void;
    pool: number;
  }) {
    const total = stats.STR + stats.CHA + stats.WIT;
    const remaining = pool - total;

    function setOne(k: "STR" | "CHA" | "WIT", v: number) {
      const clamped = Math.max(0, Math.min(20, v));
      setStats({ ...stats, [k]: clamped });
    }

    return (
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <div style={{ opacity: 0.85 }}>Remaining: {remaining}</div>

        {(["STR", "CHA", "WIT"] as const).map(k => (
          <div key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 50, fontWeight: 700 }}>{k}</div>
            <button onClick={() => setOne(k, stats[k] - 1)} disabled={stats[k] <= 0}>-</button>
            <div style={{ width: 30, textAlign: "center" }}>{stats[k]}</div>
            <button
              onClick={() => setOne(k, stats[k] + 1)}
              disabled={remaining <= 0}
            >
              +
            </button>
          </div>
        ))}
      </div>
    );
  }

  function beginNewGame(slot: number) {
    setPendingSlot(slot);
    setStats({ STR: 5, CHA: 5, WIT: 5 }); // defaults
    setMode("stats");
  }

  function confirmStats() {
    if (pendingSlot === null) return;
    startFreshInSlot(pendingSlot, stats);
    setPendingSlot(null);
  }

  function loadSlot(slot: number) {
    if (!storyJson) return;

    const s = new Story(storyJson);
    const ok = loadFromSlot(s, slot);

    if (!ok) {
      // If there is no save or it is corrupt, do nothing.
      return;
    }

    setStory(s);
    setActiveSlot(slot);

    setLines([]);
    setChoices([]);

    buildUIFromStory(s, true);

    // Normalize by resaving immediately.
    saveToSlot(s, slot);

    setMode("game");
  }

  function choose(i: number) {
    if (!story) return;
    story.ChooseChoiceIndex(i);
    buildUIFromStory(story, false);
    saveToSlot(story, activeSlot);
  }

  function backToMenu() {
    setMode("menu");
    setStory(null);
    setLines([]);
    setChoices([]);
    refreshSlotPresence();
  }

  function syncSidebar(s: Story) {
    const coinsRaw = s.variablesState["coins"];
    const coins = typeof coinsRaw === "number" ? coinsRaw : parseInt(String(coinsRaw ?? "0"), 10) || 0;
    setUiCoins(coins);

    const items: string[] = [];

    if (s.variablesState["inv_rusty_sword"]) items.push("Rusty Sword");
    if (s.variablesState["inv_old_sack"]) items.push("Old Sack");

    // Add more flags here as you add items in Ink.

    setUiInventory(items);
  }

  useEffect(() => {
    // Load story.json once on page load.
    (async () => {
      const res = await fetch("/story.json");
      const json = await res.json();
      setStoryJson(json);

      // Update save presence after localStorage is available.
      refreshSlotPresence();

      // Optional: keep last active slot highlighted in the menu.
      const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      if (Number.isFinite(n) && n >= 0 && n <= 2) setActiveSlot(n);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      {mode === "menu" && (
        <div>
          <h1 style={{ marginBottom: 8 }}>Text RPG</h1>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Choose a save slot.
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {[0, 1, 2].map(slot => (
              <div
                key={slot}
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    Save {slot + 1} {slotHasSave[slot] ? "" : "(empty)"}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: 14 }}>
                    {slotHasSave[slot] ? "Progress saved on this device." : "Start a new run here."}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => beginNewGame(slot)}>
                    New Game
                  </button>

                  <button
                    onClick={() => loadSlot(slot)}
                    disabled={!slotHasSave[slot]}
                  >
                    Load
                  </button>

                  <button
                    onClick={() => clearSlot(slot)}
                    disabled={!slotHasSave[slot]}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, opacity: 0.75, fontSize: 13 }}>
            Saves use localStorage, so they live per browser per device until deleted.
          </div>
        </div>
      )}

      {mode === "stats" && (
        <div>
          <h1 style={{ marginBottom: 8 }}>Create Character</h1>

          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Distribute {STAT_POOL} points.
          </p>

          <StatEditor
            stats={stats}
            setStats={setStats}
            pool={STAT_POOL}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={() => { setMode("menu"); setPendingSlot(null); }}>
              Back
            </button>
            <button onClick={confirmStats} disabled={stats.STR + stats.CHA + stats.WIT !== STAT_POOL}>
              Confirm
            </button>
          </div>
        </div>
      )}

      {mode === "game" && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button onClick={backToMenu}>Back to Menu</button>
            <div style={{ opacity: 0.8, alignSelf: "center" }}>
              Playing: Save {activeSlot + 1}
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Left: story */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {lines.map((t, idx) => (
                  <p key={idx}>{t}</p>
                ))}
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                {choices.map(c => (
                  <button key={c.index} onClick={() => choose(c.index)}>
                    {c.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: sidebar */}
            <aside
              style={{
                width: 240,
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 12,
                position: "sticky",
                top: 20,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Inventory</div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ opacity: 0.8, fontSize: 14 }}>Coins</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{uiCoins}</div>
              </div>

              <div style={{ opacity: 0.8, fontSize: 14, marginBottom: 6 }}>Items</div>
              {uiInventory.length === 0 ? (
                <div style={{ opacity: 0.7, fontSize: 14 }}>Empty</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {uiInventory.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
