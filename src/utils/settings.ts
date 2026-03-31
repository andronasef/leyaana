export enum SettingsList {
  name = "name",
  isMale = "isMale",
  isDarkMode = "isDarkMode",
  isWelcomed = "isWelcomed",
}

export enum Gender {
  male = "male",
  female = "female",
}

export function getSetting<T>(name: SettingsList): T {
  return localStorage.getItem(name) as T;
}

export function setSetting<T>(name: SettingsList, value: T) {
  if (value === null || value === undefined) {
    localStorage.removeItem(name);
    return;
  }

  localStorage.setItem(name, String(value));
}
