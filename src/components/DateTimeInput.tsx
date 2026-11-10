import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { dateKey, fromKey } from "../lib/date";
import { useTheme } from "../theme/ThemeProvider";
import { Input, T } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (mode: "date" | "time", v: string) => {
  if (mode === "date") return v ? fromKey(v) : new Date();
  const d = new Date();
  if (/^\d{2}:\d{2}$/.test(v)) d.setHours(+v.slice(0, 2), +v.slice(3), 0, 0);
  return d;
};
const fromDate = (mode: "date" | "time", d: Date) => (mode === "date" ? dateKey(d) : `${pad(d.getHours())}:${pad(d.getMinutes())}`);
const show = (mode: "date" | "time", v: string) => (mode === "date" ? fromKey(v).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : v);

/** Date or time field that opens the system picker. The store keeps YYYY-MM-DD and 24-hour HH:MM strings. On web it stays a text box. */
export function DateTimeInput({ mode, value, onChange, label, placeholder }: { mode: "date" | "time"; value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const { dark, c } = useTheme();
  const [open, setOpen] = useState(false); // iOS shows the picker inline under the field

  if (Platform.OS === "web") {
    return <Input value={value} onChangeText={onChange} accessibilityLabel={label} placeholder={mode === "date" ? "YYYY-MM-DD" : "HH:MM"} keyboardType="numbers-and-punctuation" maxLength={10} />;
  }

  const press = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: toDate(mode, value), mode, is24Hour: true, onChange: (e, d) => { if (e.type === "set" && d) onChange(fromDate(mode, d)); } });
      return;
    }
    setOpen(!open);
  };

  return (
    <>
      <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? show(mode, value) : "not set"}. Change`}
        className="min-h-hit justify-center rounded-sm border border-line bg-soft px-3 py-2.5 active:opacity-70">
        <T tone={value ? "ink" : "muted"}>{value ? show(mode, value) : placeholder}</T>
      </Pressable>
      {Platform.OS === "ios" && open ? (
        <DateTimePicker value={toDate(mode, value)} mode={mode} display={mode === "date" ? "inline" : "spinner"} is24Hour themeVariant={dark ? "dark" : "light"} accentColor={c.brand}
          onChange={(_, d) => { if (d) onChange(fromDate(mode, d)); }} />
      ) : null}
    </>
  );
}
