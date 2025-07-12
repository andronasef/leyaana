import { useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormLabel,
  SelectChangeEvent,
  Button,
} from "@mui/material";
import { Gender, setSetting, SettingsList } from "../utils/settings";
import { parseVerse } from "../utils/api";
import verses from "../../src/verses.json";

function AllVerses() {
  const [testName, setTestName] = useState("يوسف");
  const [testGender, setTestGender] = useState<Gender>(Gender.male);
  const [errorVersesList, setErrorVersesList] = useState<string[]>([]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTestName(event.target.value);
  };

  const handleGenderChange = (event: SelectChangeEvent) => {
    setTestGender(event.target.value as Gender);
  };

  const testVerse = (verse: string) => {
    // Temporarily set test values
    setSetting(SettingsList.name, testName);
    setSetting(SettingsList.isMale, testGender === Gender.male);

    // Parse verse with test values
    const parsed = parseVerse({ _id: "test", verse });

    // Reset to avoid affecting other parts of the app
    setSetting(SettingsList.name, null);
    setSetting(SettingsList.isMale, null);

    if (parsed) {
      // Return the parsed verse
      return parsed.verse;
    }
    return false;
  };

  return (
    <div className="flex flex-col max-w-4xl gap-4 p-4 py-12 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">
        اختبار الآيات (عدد الايات: {verses.length})
      </h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex flex-col flex-1 gap-2">
          <FormLabel>الاسم للاختبار</FormLabel>
          <TextField
            value={testName}
            onChange={handleNameChange}
            label="ادخل اسم"
            variant="outlined"
          />
        </div>

        <div className="flex flex-col flex-1 gap-2">
          <FormLabel>النوع للاختبار</FormLabel>
          <Select value={testGender} onChange={handleGenderChange}>
            <MenuItem value={Gender.male}>👦 ولد</MenuItem>
            <MenuItem value={Gender.female}>👧 بنت</MenuItem>
          </Select>
        </div>
      </div>
      {errorVersesList.length > 0 && (
        <div>
          <div className="p-4 font-extrabold text-red-500">الاخطاء</div>
          <ul>
            {errorVersesList.map((verse, index) => (
              <li key={index}>{verse}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4">
        {verses.map((verse, index) => {
          const theParsedVerse = testVerse(verse.verse);
          const isError = theParsedVerse === false;
          if (isError) {
            // If there is an error, add to the error list
            setErrorVersesList((prev) => [
              ...prev,
              "Verse #" + (index + 1) + ": " + verse.verse,
            ]);
          }
          return (
            <div
              key={index}
              className={
                "p-4 bg-white border rounded-lg shadow-sm" +
                (isError ? " border-red-500 border-4" : " border-gray-300")
              }
            >
              <div className="mb-2 font-bold text-gray-600 ">
                Verse #{index + 1}
              </div>
              <div className="text-lg">
                {isError ? "حدث مشكلة اثناء عمل الاية" : theParsedVerse}
              </div>
              <div className="mt-2 text-sm text-gray-500">{verse.verse}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AllVerses;
