import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import { ColorModeContext } from "../App";
import { arabicFontStack } from "../theme";
import AddPage from "./Add";
import {
  ContentType,
  NamedContent,
  Verse,
  getGodNames,
  getHeavenlyBlessings,
  getVerses,
  parseNamedContent,
  parseVerse,
  pickRandomItem,
} from "../utils/api";
import { SettingsList, getSetting, setSetting } from "../utils/settings";

const contentTabs: Array<{ value: ContentType; label: string }> = [
  { value: "verse", label: "الآيات" },
  { value: "godName", label: "أسماء الله" },
  { value: "heavenlyBlessing", label: "البركات" },
];

interface HomepageProps {
  currentTab: string;
}

function Homepage({ currentTab }: HomepageProps) {
  const colorMode = useContext(ColorModeContext);
  const [randomContent, setRandomContent] = useState<{
    verse?: Verse;
    godName?: NamedContent;
    heavenlyBlessing?: NamedContent;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeHomeTab, setActiveHomeTab] = useState<ContentType>("verse");
  const [hasLoadedHome, setHasLoadedHome] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    getSetting<string>(SettingsList.isDarkMode) === "true",
  );

  const displayName = useMemo(
    () => getSetting<string>(SettingsList.name) || "صديقي",
    [],
  );

  const loadRandomContent = async () => {
    setLoading(true);
    setError("");

    try {
      const [verses, godNames, blessings] = await Promise.all([
        getVerses(),
        getGodNames(),
        getHeavenlyBlessings(),
      ]);

      const pickedVerse = pickRandomItem(verses);
      const pickedGodName = pickRandomItem(godNames);
      const pickedBlessing = pickRandomItem(blessings);

      setRandomContent({
        verse: pickedVerse ? parseVerse(pickedVerse) : undefined,
        godName: pickedGodName ? parseNamedContent(pickedGodName) : undefined,
        heavenlyBlessing: pickedBlessing
          ? parseNamedContent(pickedBlessing)
          : undefined,
      });
      setHasLoadedHome(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل محتوى اليوم.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === "home" && !hasLoadedHome) {
      void loadRandomContent();
    }
  }, [currentTab, hasLoadedHome]);

  const resetWelcomeState = () => {
    setSetting(SettingsList.isWelcomed, null);
    window.location.reload();
  };

  const toggleDarkMode = () => {
    colorMode.toggleColorMode();
    setIsDarkMode((current) => !current);
  };

  const renderActiveContent = () => {
    if (activeHomeTab === "verse") {
      const verse = randomContent.verse;
      if (!verse) {
        return <Alert severity="info">لا توجد آيات متاحة حاليًا.</Alert>;
      }

      return (
        <Box className="flex flex-col gap-4 py-2">
          <Typography
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontWeight: 700 }}
            fontFamily={arabicFontStack}
            variant="h5"
          >
            {`"${verse.verse}"`}
          </Typography>
          {verse.title ? (
            <Typography
              color="text.secondary"
              fontWeight={700}
              fontFamily={arabicFontStack}
            >
              {verse.title}
            </Typography>
          ) : null}
        </Box>
      );
    }

    const namedItem =
      activeHomeTab === "godName"
        ? randomContent.godName
        : randomContent.heavenlyBlessing;

    if (!namedItem) {
      return (
        <Alert severity="info">لا يوجد محتوى متاح في هذا القسم حاليًا.</Alert>
      );
    }

    return (
      <Box className="flex flex-col gap-4 py-2">
        <Typography variant="h4" fontWeight={700} fontFamily={arabicFontStack}>
          {namedItem.name}
        </Typography>

        {namedItem.mean ? (
          <Typography
            color="text.secondary"
            fontWeight={700}
            fontFamily={arabicFontStack}
          >
            {namedItem.mean}
          </Typography>
        ) : null}

        {namedItem.content ? (
          <Typography
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.85 }}
            fontFamily={arabicFontStack}
          >
            {namedItem.content}
          </Typography>
        ) : null}
      </Box>
    );
  };

  if (currentTab === "settings") {
    return (
      <div className="flex flex-col gap-6 px-4 py-8">
        <Typography variant="h5" fontWeight={700} fontFamily={arabicFontStack}>
          الإعدادات
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <FormControlLabel
            control={<Switch checked={isDarkMode} onChange={toggleDarkMode} />}
            label={isDarkMode ? "الوضع الليلي مفعل" : "الوضع النهاري مفعل"}
            sx={{
              mb: 2,
              width: "100%",
              justifyContent: "space-between",
              ml: 0,
            }}
          />

          <Typography mb={3}>
            يمكنك تعديل بياناتك الشخصية مثل اسمك الذي يظهر في التطبيق وتفضيلاتك
            الأخرى من خلال إعادة الإعداد.
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={resetWelcomeState}
            sx={{ fontFamily: arabicFontStack, fontWeight: 700 }}
          >
            تعديل بياناتي (إعادة التهيئة)
          </Button>
        </Paper>
      </div>
    );
  }

  if (currentTab === "create") {
    return (
      <AddPage
        onChanged={() => {
          setHasLoadedHome(false);
        }}
      />
    );
  }

  // Home Tab
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Paper
        elevation={0}
        sx={{
          p: 1,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Tabs
          value={activeHomeTab}
          onChange={(_, value: ContentType) => setActiveHomeTab(value)}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              fontFamily: arabicFontStack,
              fontWeight: 700,
              fontSize: "1rem",
            },
          }}
        >
          {contentTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          minHeight: 320,
          p: 3,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <Typography
            color="text.secondary"
            fontFamily={arabicFontStack}
            fontWeight={700}
          >
            {activeHomeTab === "verse"
              ? "آية النهارده"
              : activeHomeTab === "godName"
                ? "اسم من أسماء الله"
                : "بركة النهارده"}
          </Typography>
        </div>

        {loading ? (
          <Box className="flex flex-col items-center justify-center gap-3 py-8">
            <CircularProgress size={30} />
            <Typography fontFamily={arabicFontStack} color="text.secondary">
              جاري تجهيز محتوى اليوم...
            </Typography>
          </Box>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ fontFamily: arabicFontStack }}>
            {error}
          </Alert>
        ) : null}

        {!loading && !error ? renderActiveContent() : null}

        <Box className="flex justify-end mt-6">
          <Button
            variant="outlined"
            size="small"
            onClick={() => void loadRandomContent()}
            sx={{ fontFamily: arabicFontStack, borderRadius: "12px" }}
          >
            تحديث
          </Button>
        </Box>
      </Paper>
    </div>
  );
}
export default Homepage;
