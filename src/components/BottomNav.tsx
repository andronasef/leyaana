import * as React from "react";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SettingsIcon from "@mui/icons-material/Settings";

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export default function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        margin: "0 auto",
        maxWidth: "448px", // matches max-w-md
        zIndex: 50,
        pb: "env(safe-area-inset-bottom)",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={currentTab}
        onChange={(_, newValue) => {
          onChangeTab(newValue);
        }}
        sx={{
          height: 64,
          "& .MuiBottomNavigationAction-label": {
            fontFamily: "Cairo, sans-serif",
            fontWeight: 600,
          },
        }}
      >
        <BottomNavigationAction
          value={"home"}
          label="اليوم"
          icon={<AutoAwesomeIcon />}
        />
        <BottomNavigationAction
          value={"create"}
          label="إضافة"
          icon={<AddCircleOutlineIcon />}
        />
        <BottomNavigationAction
          value={"settings"}
          label="الاعدادات"
          icon={<SettingsIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}
