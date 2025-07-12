import verses from "../../src/verses.json";
import { SettingsList, getSetting } from "./settings";

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

export function parseVerse(myVerse: Verse) {
  const BioVerse = myVerse.verse.split("---");

  // Check if it for male or female first
  if (BioVerse.length == 2) {
    myVerse.verse = isMale() ? BioVerse[0] : BioVerse[1];
  }

  // Replace variables
  Object.entries(replaceVars).forEach(([key, value]) => {
    myVerse.verse = myVerse.verse.replace(key, value());
  });

  return myVerse;
}

function isMale() {
  // Check if it male LoalStorage
  const isUserMale = getSetting(SettingsList.isMale) == "true";
  return Boolean(isUserMale);
}

function getPersonName(): string {
  // from localStorge or default
  return getSetting(SettingsList.name) ?? "[لو سمحت دخل اسمك في الاعدادات]";
}

const replaceVars = {
  "<الاسم>": getPersonName,
};

export const versesLength = verses.length;
