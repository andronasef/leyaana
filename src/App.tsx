import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Homepage from "./routes/Homepage";
import "./assets/index.css";
import "@fontsource-variable/noto-sans-arabic";
import WelcomePage from "./routes/Welcome";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
import { useEffect } from "react";
import { SettingsList, getSetting } from "./utils/settings";
import { Toaster } from "react-hot-toast";
import AllVersesPage from "./routes/All";
import { useBrowserLocation } from "wouter/use-browser-location";
import AllVerses from "./routes/All";

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

function App() {
  const isDev = import.meta.env.DEV;
  const [location, setLocation] = useBrowserLocation();

  useEffect(() => {
    if (getSetting(SettingsList.isWelcomed)) setLocation("homepage");
  });

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Toaster />

        <AllVerses />
      </ThemeProvider>
    </CacheProvider>
  );
}
export default App;
