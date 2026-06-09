/**
 * data.js
 * Central Data Management Layer — Firebase Realtime Database Edition
 * Drop-in replacement: all function names and signatures are identical.
 * Only the storage backend has changed (Firebase instead of localStorage).
 */
 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
 
const firebaseConfig = {
  apiKey: "AIzaSyD70rB18lNYK_TY1AqyJrPZboVTQQOlcWo",
  authDomain: "aviation-orbat.firebaseapp.com",
  databaseURL: "https://aviation-orbat-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aviation-orbat",
  storageBucket: "aviation-orbat.firebasestorage.app",
  messagingSenderId: "1075681690213",
  appId: "1:1075681690213:web:84541a8cd98e4d4edf7c8c",
  measurementId: "G-2L21DRSRT2"
};
 
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const STATE_REF = ref(db, 'fleet_state');
 
// ─── Default state (same as before) ──────────────────────────────────────────
const DEFAULT_STATE = {
  users: [],
  ranks: [
    { key: "Airman Basic",            category: "ENLISTED"     },
    { key: "Airman",                  category: "ENLISTED"     },
    { key: "Airman First Class",      category: "ENLISTED"     },
    { key: "Senior Airman",           category: "NCO"          },
    { key: "Sergeant",                category: "NCO"          },
    { key: "Chief Master Sergeant",   category: "NCO"          },
    { key: "2nd Lieutenant",          category: "OFFICER"      },
    { key: "1st Lieutenant",          category: "OFFICER"      },
    { key: "Captain",                 category: "OFFICER"      },
    { key: "Lieutenant General",      category: "HIGH-COMMAND" },
    { key: "General",                 category: "HIGH-COMMAND" },
    { key: "General of the AirForce", category: "HIGH-COMMAND" }
  ],
  divisions: ["1st Aviators Division", "16th Air Assault Brigade"],
  masterKey: "RRR23TOOTMOV1603",
  customIntelNodes: []
};
 
// ─── In-memory cache so reads stay synchronous (same as before) ──────────────
let _cache = null;
 
/**
 * Subscribe to live updates from Firebase.
 * Call this once on page load (admin.js and index.js already call
 * buildAdminTree / renderOrbat on DOMContentLoaded, so we trigger those
 * automatically whenever the database changes).
 */
function _startLiveSync() {
  onValue(STATE_REF, (snapshot) => {
    const raw = snapshot.val();
    if (!raw) {
      _cache = DEFAULT_STATE;
    } else {
      // Merge ranks so new default ranks are never lost
      const mergedRanks = DEFAULT_STATE.ranks.map((defaultRank) => {
        const existing = raw.ranks && raw.ranks.find((r) => r.key === defaultRank.key);
        return existing || defaultRank;
      });
      _cache = {
        users:            raw.users            || [],
        ranks:            mergedRanks,
        divisions:        (raw.divisions && raw.divisions.length) ? raw.divisions : DEFAULT_STATE.divisions,
        masterKey:        raw.masterKey        || DEFAULT_STATE.masterKey,
        customIntelNodes: raw.customIntelNodes || []
      };
    }
 
    // Re-render whichever page is active
    if (typeof renderOrbat      === 'function') renderOrbat();
    if (typeof buildAdminTree   === 'function') buildAdminTree();
    if (typeof buildIntelligenceBoard === 'function') buildIntelligenceBoard();
  });
}
 
// Kick off the live listener immediately
_startLiveSync();
 
// ─── Public API (identical signatures to the old version) ────────────────────
const marleyanFleet = {
 
  /**
   * Returns the current state synchronously from the in-memory cache.
   * Falls back to default if Firebase hasn't replied yet.
   */
  loadFleetState: () => {
    return _cache || DEFAULT_STATE;
  },
 
  /**
   * Writes state to Firebase. All connected browsers will update within
   * milliseconds via the onValue listener above.
   */
  saveFleetState: (state) => {
    set(STATE_REF, state).catch((err) => {
      console.error("Firebase write failed:", err);
    });
  },
 
  // Generates unique tokens for identifying personnel (unchanged)
  createUserToken: () => {
    return 'USR_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  },
 
  // Resets the database back to defaults
  resetToDefaults: () => {
    set(STATE_REF, DEFAULT_STATE).then(() => window.location.reload());
  },
 
  // Find a user by their unique token (unchanged logic)
  getUserByToken: (token) => {
    if (!token) return null;
    const state = marleyanFleet.loadFleetState();
    return state.users.find((u) => u.token === token) || null;
  }
};
 
