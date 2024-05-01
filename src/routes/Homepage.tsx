import { useEffect, useState } from "react";
import { Verse, getRandomTodayVerse, parseVerse } from "../utils/api";

function Homepage() {
  const [todayVerse, setTodayVerse] = useState<Verse>();

  useEffect(() => {
    setTodayVerse(parseVerse(getRandomTodayVerse()));
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <p className="text-xl font-semibold p-4 text-center">
        {todayVerse && todayVerse.verse}
      </p>
    </div>
  );
}
export default Homepage;
