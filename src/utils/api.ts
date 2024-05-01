import verses from "../verses.json";

export type Verse = {
  _id: string;
  verse: string;
};

// function getUserUniqueNumber() {
//   const userUniqueNumber =
//     localStorage.getItem("userUniqueNumber") ?? Math.random();
//   localStorage.setItem("userUniqueNumber", userUniqueNumber as string);
//   return userUniqueNumber as number;
// }

// function getUniqueDayNumber() {
//   const date = new Date();

//   const key = `${date.getFullYear()}${date.getMonth()}${date.getDate()}`;

//   return key as unknown as number;
// }

export function getRandomTodayVerse() {
  const verseIndex =
    // random verse for now
    Math.floor(Math.random() * verses.length);
  // Math.floor(getUserUniqueNumber() * getUniqueDayNumber()) % verses.length;

  return verses[verseIndex] as Verse;
}

export function parseVerse(verse: Verse) {
  const parsedVerse: Verse = verse;
  const BioVerse = verse.verse.split("---");
  // Check if it for male / female

  parsedVerse.verse = isMale() ? BioVerse[0] : BioVerse[1];

  // Replace variables
  Object.entries(replaceVars).forEach(([key, value]) => {
    parsedVerse.verse = parsedVerse.verse.replace(key, value());
  });

  return parsedVerse;
}

function isMale() {
  // Check if it male LoalStorage
  return true;
}

function getPersonName() {
  // from localStorge or default
  return localStorage.getItem("personName") ?? "[اندرو]";
}

const replaceVars = {
  "<الاسم>": getPersonName,
};
