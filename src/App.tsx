import Homepage from "./routes/Homepage";
import "./assets/index.css";
import "@fontsource/cairo";
import "@fontsource-variable/noto-sans-arabic";
import WelcomePage from "./routes/Welcome";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider, CssBaseline, Fade, useMediaQuery } from "@mui/material";
import { getTheme } from "./theme";
import React, { useEffect, useMemo, useState } from "react";
import { SettingsList, getSetting, setSetting } from "./utils/settings";
import { startDailyReminderWatcher } from "./utils/notifications";
import { Toaster } from "react-hot-toast";
import BottomNav from "./components/BottomNav";
import { flushPendingMutations } from "./utils/api";

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

export const ColorModeContext = React.createContext({
  toggleColorMode: () => {},
});

type AppTab = "home" | "create" | "settings";

function App() {
  const [isWelcomed, setIsWelcomed] = useState(
    getSetting<string>(SettingsList.isWelcomed) === "true",
  );
  const [currentTab, setCurrentTab] = useState<AppTab>("home");
  const [visibleTab, setVisibleTab] = useState<AppTab>("home");
  const [transitionIn, setTransitionIn] = useState(true);
  const [nextTab, setNextTab] = useState<AppTab | null>(null);

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
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  const transitionTimeout = prefersReducedMotion
    ? { enter: 0, exit: 0 }
    : { enter: 130, exit: 90 };

  useEffect(() => {
    let disposed = false;

    const syncPendingChanges = async () => {
      const result = await flushPendingMutations();
      if (!disposed && result.processed > 0) {
        console.info(`Synced ${result.processed} offline changes.`);
      }
    };

    void syncPendingChanges();

    const handleOnline = () => {
      void syncPendingChanges();
    };

    window.addEventListener("online", handleOnline);

    const stopWatcher = startDailyReminderWatcher();
    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      stopWatcher();
    };
  }, []);

  useEffect(() => {
    if (!isWelcomed) {
      setVisibleTab("home");
      setCurrentTab("home");
      setTransitionIn(true);
      setNextTab(null);
      return;
    }

    if (currentTab === visibleTab) {
      return;
    }

    setNextTab(currentTab);
    setTransitionIn(false);
  }, [currentTab, isWelcomed, visibleTab]);

  const handleTabExited = () => {
    if (!nextTab) {
      return;
    }

    setVisibleTab(nextTab);
    setNextTab(null);
    setTransitionIn(true);
  };

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
                <div className="relative h-full">
                  <Fade
                    in={transitionIn}
                    timeout={transitionTimeout}
                    mountOnEnter
                    unmountOnExit
                    onExited={handleTabExited}
                  >
                    <div className="h-full">
                      <Homepage currentTab={visibleTab} />
                    </div>
                  </Fade>
                </div>
              ) : (
                <div className="px-4 py-8">
                  <WelcomePage onComplete={() => setIsWelcomed(true)} />
                </div>
              )}
            </div>
            {isWelcomed && (
              <BottomNav
                currentTab={currentTab}
                onChangeTab={(tab) => setCurrentTab(tab as AppTab)}
              />
            )}
          </div>
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}
export default App;
