import {
  Button,
  FormLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { useState } from "react";
import { Gender, setSetting, SettingsList } from "../utils/settings";
import toast from "react-hot-toast";

type WelcomePageProps = {
  onComplete?: () => void;
};

function WelcomePage({ onComplete }: WelcomePageProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState(Gender.male);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleGenderChange = (event: SelectChangeEvent) => {
    setGender(event.target.value as Gender);
  };

  function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (name.trim().indexOf(" ") != -1)
      return toast.error("مش قولنا ندخل الاسم الاول بس ", {
        icon: "😒",
      });
    setSetting(SettingsList.name, name.trim());
    setSetting(SettingsList.isMale, String(gender === Gender.male));
    setSetting(SettingsList.isWelcomed, true);
    onComplete?.();
  }
  return (
    <form className="flex flex-col h-full gap-4" onSubmit={start}>
      <div className="text-2xl font-bold">اهلا بيك!</div>
      <div className="text-lg">
        اهلا بيك في ابليكشن ليا انا او في الحقيقة هو ليك انت ده المكان اللي
        بتصلي وبتفتكر في انه الله عمل حاجات كتيير جميلة علشانك. هنا بنشجعك انك
        تعيش الكلمة وتكون ليك انت 💖. بس قبل ما لازم ندخل البيانات اللي تحت دي!
        شكرا واتمنالك رحله جميلة 🚀
      </div>

      <FormLabel id="name">الاسم</FormLabel>
      <TextField
        required
        id="name"
        label="اسمك اي (الاول بس)؟!"
        variant="outlined"
        value={name}
        onChange={handleNameChange}
      />
      <FormLabel id="gender">النوع</FormLabel>
      <Select
        required
        labelId="gender"
        id="gender"
        value={gender}
        label="Age"
        onChange={handleGenderChange}
      >
        <MenuItem value={Gender.male}>👦 ولد</MenuItem>
        <MenuItem value={Gender.female}>👧 بنت</MenuItem>
      </Select>
      <Button type="submit" variant="contained">
        اتفضل
      </Button>
    </form>
  );
}
export default WelcomePage;
