import { Route, Router, Switch, useLocation } from "wouter";
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

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

function App() {
  useHashLocation();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!getSetting(SettingsList.isWelcomed)) setLocation("/#welcome");
  });

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Toaster />

        <Router hook={useHashLocation}>
          <div className="flex flex-col h-screen" dir="rtl">
            <div className="flex-grow p-4">
              <Switch>
                <Route path="/">
                  <Homepage />
                </Route>
                <Route path="/welcome">
                  <WelcomePage />
                </Route>
                <Route>
                  <div className="text-2xl text-red-500">
                    404: No such page!
                  </div>
                </Route>
              </Switch>
            </div>
            {/* <BottomNav /> */}
          </div>
        </Router>
      </ThemeProvider>
    </CacheProvider>
  );
}
export default App;
