import { Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Homepage from "./routes/Homepage";
import Settings from "./routes/Settings";
import "./assets/index.css";
import "@fontsource-variable/noto-sans-arabic";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
import { useEffect } from "react";
// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

function App() {
  useHashLocation();
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Toaster />
        <Switch>
          <Route path="/">
            <Homepage />
          </Route>
          <Route path="/settings">
            <Settings />
          </Route>
          <Route>
            <div className="text-2xl text-red-500">404: No such page!</div>
          </Route>
        </Switch>
      </div>
      {/* <BottomNav /> */}
    </div>
      </ThemeProvider>
    </CacheProvider>
  );
}
export default App;
