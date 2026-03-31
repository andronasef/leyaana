import Homepage from "./routes/Homepage";
import "./assets/index.css";
import "@fontsource/cairo";
import "@fontsource-variable/noto-sans-arabic";
import WelcomePage from "./routes/Welcome";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { getTheme } from "./theme";
import React, { useState, useMemo } from "react";
import { SettingsList, getSetting, setSetting } from "./utils/settings";
import { Toaster } from "react-hot-toast";
import BottomNav from "./components/BottomNav";

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

export const ColorModeContext = React.createContext({
  toggleColorMode: () => {},
});

function App() {
  const [isWelcomed, setIsWelcomed] = useState(
    getSetting<string>(SettingsList.isWelcomed) === "true",
  );
  const [currentTab, setCurrentTab] = useState("home");

  const [mode, setMode] = useState<"light" | "dark">(
    getSetting<string>(SettingsList.isDarkMode) === "true" ? "dark" : "light",
  );

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          setSetting(SettingsList.isDarkMode, newMode === "dark");
          return newMode;
        });
      },
    }),
    [],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Toaster />
          <div
            className="mx-auto flex min-h-[100dvh] max-w-md flex-col sm:border-x shadow-xl overflow-hidden relative"
            style={{
              backgroundColor: theme.palette.background.default,
              borderColor: theme.palette.divider,
            }}
          >
            <div className="flex-1 overflow-y-auto pb-16 scrollbar-hide">
              {isWelcomed ? (
                <Homepage currentTab={currentTab} />
              ) : (
                <div className="px-4 py-8">
                  <WelcomePage onComplete={() => setIsWelcomed(true)} />
                </div>
              )}
            </div>
            {isWelcomed && (
              <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
            )}
          </div>
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}
export default App;
