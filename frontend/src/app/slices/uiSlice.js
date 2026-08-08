import { createSlice } from "@reduxjs/toolkit";

// Read initial dark mode preference from localStorage or system preference
const getInitialDarkMode = () => {
  const stored = localStorage.getItem("vidtube-dark-mode");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    sidebarOpen: true,
    darkMode: getInitialDarkMode(),
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebar: (state, action) => { state.sidebarOpen = action.payload; },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem("vidtube-dark-mode", state.darkMode);
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
      localStorage.setItem("vidtube-dark-mode", action.payload);
    },
  },
});

export const { toggleSidebar, setSidebar, toggleDarkMode, setDarkMode } = uiSlice.actions;
export default uiSlice.reducer;
