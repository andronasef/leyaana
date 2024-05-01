import { Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Homepage from "./routes/Homepage";
import Settings from "./routes/Settings";
import "./assets/index.css";
import "@fontsource-variable/noto-sans-arabic";

function App() {
  useHashLocation();
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow">
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
  );
}
export default App;
