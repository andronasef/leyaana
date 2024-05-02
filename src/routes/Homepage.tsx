import { useEffect, useState } from "react";
import {
  Verse,
  getRandomTodayVerse,
  parseVerse,
  versesLength,
} from "../utils/api";

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
      <p className="absolute bottom-3 font-semibold text-sm text-gray-500">
        {versesLength} آية ليا انا
      </p>
    </div>
  );
}
export default Homepage;
