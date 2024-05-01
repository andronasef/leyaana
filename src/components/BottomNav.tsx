import * as React from "react";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import SubjectIcon from "@mui/icons-material/Subject";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SettingsIcon from "@mui/icons-material/Settings";

export default function BottomNav() {
  const [value, setValue] = React.useState("home");

  return (
    <Box>
      <BottomNavigation
        value={value}
        onChange={(_, newValue) => {
          setValue(newValue);
        }}
      >
        <BottomNavigationAction
          value={"home"}
          label="ايه اليوم"
          icon={<SubjectIcon />}
        />
        <BottomNavigationAction
          value={"favourites"}
          label="المفضلة"
          icon={<FavoriteIcon />}
        />
        <BottomNavigationAction
          value={"settings"}
          label="الاعدادات"
          icon={<SettingsIcon />}
        />
      </BottomNavigation>
    </Box>
  );
}
