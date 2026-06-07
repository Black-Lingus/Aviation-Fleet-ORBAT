/**
 * assets/js/data.js
 * Central Data Management Layer
 * Acts as the Single Source of Truth for the Marleyan Aviation Fleet.
 */


const marleyanFleet = {
  // Retrieves the current state from LocalStorage or returns default structure
  loadFleetState: () => {
    const data = localStorage.getItem('marleyan_fleet_state');
    const defaultState = {
      users: [],
      ranks: [
        { key: "Airman Basic", category: "ENLISTED" },
        { key: "Airman", category: "ENLISTED" },
        { key: "Airman First Class", category: "ENLISTED" },
        { key: "Senior Airman", category: "NCO" },
        { key: "Sergeant", category: "NCO" },
        { key: "Chief Master Sergeant", category: "NCO" },
        { key: "2nd Lieutenant", category: "OFFICER" },
        { key: "1st Lieutenant", category: "OFFICER" },
        { key: "Captain", category: "OFFICER" },
        { key: "Lieutenant General", category: "HIGH-COMMAND" },
        { key: "General", category: "HIGH-COMMAND" },
        { key: "General of the AirForce", category: "HIGH-COMMAND" }
      ],
      divisions: ["1st Aviators Division", "16th Air Assault Brigade"],
      masterKey: "RRR23TOOTMOV1603",
      customIntelNodes: [] // Stores the layout state for the Aviation Information workspace
    };

    if (data) {
      const parsed = JSON.parse(data);
      const mergedRanks = defaultState.ranks.map((defaultRank) => {
        const existing = parsed.ranks && parsed.ranks.find((rank) => rank.key === defaultRank.key);
        return existing || defaultRank;
      });

      return {
        users: parsed.users || defaultState.users,
        ranks: mergedRanks,
        divisions: parsed.divisions && parsed.divisions.length ? parsed.divisions : defaultState.divisions,
        masterKey: parsed.masterKey || defaultState.masterKey,
        customIntelNodes: parsed.customIntelNodes || defaultState.customIntelNodes
      };
    }

    return defaultState;
  },


  // Saves the state object to LocalStorage as a string
  saveFleetState: (state) => {
    localStorage.setItem('marleyan_fleet_state', JSON.stringify(state));
  },


  // Generates unique tokens for identifying personnel
  createUserToken: () => {
    return 'USR_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  },


  // Helper to reset the database (useful for testing)
  resetToDefaults: () => {
    localStorage.removeItem('marleyan_fleet_state');
    window.location.reload();
  }
  ,

  // Find a user by their unique token
  getUserByToken: (token) => {
    if (!token) return null;
    const state = marleyanFleet.loadFleetState();
    const user = state.users.find((u) => u.token === token);
    return user || null;
  }
};

