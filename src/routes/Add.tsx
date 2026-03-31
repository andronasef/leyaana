import { Paper, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import ContentManager from "../components/ContentManager";
import { arabicFontStack } from "../theme";
import { ContentType } from "../utils/api";

const contentTabs: Array<{ value: ContentType; label: string }> = [
  { value: "verse", label: "الآيات" },
  { value: "godName", label: "أسماء الله" },
  { value: "heavenlyBlessing", label: "البركات" },
];

type AddPageProps = {
  onChanged?: (type: ContentType) => void;
};

export default function AddPage({ onChanged }: AddPageProps) {
  const [activeContentTab, setActiveContentTab] =
    useState<ContentType>("verse");

  return (
    <div className="flex flex-col gap-4 px-4 py-8">
      <Typography
        variant="h5"
        fontWeight={700}
        fontFamily={arabicFontStack}
        mb={1}
      >
        إضافة وإدارة المحتوى
      </Typography>

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
          value={activeContentTab}
          onChange={(_, value: ContentType) => setActiveContentTab(value)}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              fontFamily: arabicFontStack,
              fontWeight: 700,
              fontSize: "0.95rem",
            },
          }}
        >
          {contentTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      <ContentManager type={activeContentTab} onChanged={onChanged} />
    </div>
  );
}
