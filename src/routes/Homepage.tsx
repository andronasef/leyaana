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
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ColorModeContext } from "../App";
import { arabicFontStack } from "../theme";
import {
  getNotificationSupportState,
  getReminderTimeLabel,
  isReminderEnabled,
  refreshAndShowReminders,
  registerPeriodicReminderSync,
  reminderPeriods,
  reminders,
  requestNotificationPermission,
} from "../utils/notifications";
import AddPage from "./Add";
import {
  ContentType,
  NamedContent,
  Period,
  Verse,
  getGodNames,
  getHeavenlyBlessings,
  getVerses,
  parseNamedContent,
  parseVerse,
  getDailyItem,
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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
  const [reminderEnabled, setReminderEnabled] = useState(
    () =>
      Object.fromEntries(
        reminderPeriods.map((period) => [period, isReminderEnabled(period)]),
      ) as Record<Period, boolean>,
  );
  const [notificationPermission, setNotificationPermission] = useState(
    getNotificationSupportState(),
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const deferredInstallPromptRef = useRef<BeforeInstallPromptEvent | null>(
    null,
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

      const pickedVerse = getDailyItem(verses, "verse");
      const pickedGodName = getDailyItem(godNames, "godName");
      const pickedBlessing = getDailyItem(blessings, "blessing");

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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      deferredInstallPromptRef.current = null;
      setCanInstallPwa(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const resetWelcomeState = () => {
    setSetting(SettingsList.isWelcomed, null);
    window.location.reload();
  };

  const toggleDarkMode = () => {
    colorMode.toggleColorMode();
    setIsDarkMode((current) => !current);
  };

  const toggleReminder = async (period: Period, enabled: boolean) => {
    setReminderEnabled((current) => ({ ...current, [period]: enabled }));
    setSetting(reminders[period].enabledSetting, enabled);

    let permission = getNotificationSupportState();
    if (enabled && permission === "default") {
      permission = await requestNotificationPermission();
    }

    setNotificationPermission(permission);

    // Mirror the new flag into IndexedDB so the worker sees it too, then let
    // the shared logic decide whether anything is actually due right now.
    await refreshAndShowReminders();

    if (enabled) {
      void registerPeriodicReminderSync();
    }
  };

  const askNotificationPermission = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      await refreshAndShowReminders();
      void registerPeriodicReminderSync();
    }
  };

  const installPwa = async () => {
    const deferredPrompt = deferredInstallPromptRef.current;
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredInstallPromptRef.current = null;
    setCanInstallPwa(false);
  };

  const reminderStatus = (() => {
    const timeLabel = getReminderTimeLabel();

    if (notificationPermission === "unsupported") {
      return "المتصفح لا يدعم إشعارات النظام على هذا الجهاز.";
    }

    if (!reminderPeriods.some((period) => reminderEnabled[period])) {
      return `فعّل أي تنبيه لتصلك الآية الساعة ${timeLabel}.`;
    }

    if (notificationPermission === "granted") {
      return `التنبيهات مفعلة. هتوصلك الآية أول ما تفتح التطبيق بعد الساعة ${timeLabel}. ولو التطبيق متثبت على الجهاز، ممكن توصلك من غير ما تفتحه، بس المتصفح هو اللي بيحدد الوقت.`;
    }

    if (notificationPermission === "denied") {
      return "الإشعارات مرفوضة من المتصفح. اسمح بها من إعدادات المتصفح أولًا.";
    }

    return `اسمح بالإشعارات ليوصلك التنبيه الساعة ${timeLabel}.`;
  })();

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
          <Alert severity={isOnline ? "success" : "warning"} sx={{ mb: 2 }}>
            {isOnline
              ? "أنت الآن متصل بالإنترنت. أي تغييرات معلقة سيتم مزامنتها تلقائيًا."
              : "أنت الآن offline. تقدر تقرأ المحتوى وتضيف تعديلات، وهيتعمل لها sync أول ما الاتصال يرجع."}
          </Alert>

          {canInstallPwa ? (
            <Button
              variant="contained"
              fullWidth
              sx={{ fontFamily: arabicFontStack, fontWeight: 700, mb: 2 }}
              onClick={() => {
                void installPwa();
              }}
            >
              تثبيت التطبيق على الجهاز
            </Button>
          ) : (
            <Typography
              mb={2}
              color="text.secondary"
              fontFamily={arabicFontStack}
            >
              التطبيق قابل للتثبيت كـ PWA. لو زر التثبيت غير ظاهر فغالبًا
              التطبيق مثبت بالفعل أو المتصفح لا يعرض المطالبة الآن.
            </Typography>
          )}

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

          {reminderPeriods.map((period) => (
            <FormControlLabel
              key={period}
              control={
                <Switch
                  checked={reminderEnabled[period]}
                  onChange={(_, checked) => {
                    void toggleReminder(period, checked);
                  }}
                />
              }
              label={`تنبيه ${reminders[period].title}`}
              sx={{
                mb: 1,
                width: "100%",
                justifyContent: "space-between",
                ml: 0,
              }}
            />
          ))}

          <Typography
            mb={2}
            color="text.secondary"
            fontFamily={arabicFontStack}
          >
            {reminderStatus}
          </Typography>

          {notificationPermission !== "granted" &&
          notificationPermission !== "unsupported" ? (
            <Button
              variant="outlined"
              fullWidth
              sx={{ fontFamily: arabicFontStack, fontWeight: 700, mb: 2 }}
              onClick={() => {
                void askNotificationPermission();
              }}
            >
              تفعيل إذن الإشعارات
            </Button>
          ) : null}

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
