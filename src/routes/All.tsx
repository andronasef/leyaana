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
import verses from "../../public/verses.json";

function AllVersesPage() {
  const [testName, setTestName] = useState("يوسف");
  const [testGender, setTestGender] = useState<Gender>(Gender.male);

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

    return parsed.verse;
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="mb-4 text-2xl font-bold">اختبار الآيات</h1>

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

      <div className="grid gap-4">
        {verses.map((verse, index) => (
          <div key={index} className="p-4 bg-white border rounded-lg shadow-sm">
            <div className="mb-2 font-bold text-gray-600">
              Verse #{index + 1}
            </div>
            <div className="text-lg">{testVerse(verse.verse)}</div>
            <div className="mt-2 text-sm text-gray-500">{verse.verse}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AllVersesPage;
