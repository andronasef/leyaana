import { createTheme } from "@mui/material/styles";

export const arabicFontStack = [
  "Cairo",
  "Noto Sans Arabic Variable",
  "Noto Sans Arabic",
  "Segoe UI Emoji",
  "Apple Color Emoji",
  "Noto Color Emoji",
  "sans-serif",
].join(",");

export const getTheme = (mode: "light" | "dark") => {
  return createTheme({
    direction: "rtl",
    typography: {
      fontFamily: arabicFontStack,
    },
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#FF7043" : "#FF8A65", // the orange color from screenshot
      },
      background: {
        default: mode === "light" ? "#f9f9f9" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1e1e1e",
      },
    },
    shape: {
      borderRadius: 24,
    },
  });
};
