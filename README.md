# Techomato DailyBoard

A customizable "real life dashboard" for Android, iOS and web. One home screen of widgets (habits, tasks, money, notes and more). Everything is stored on the device. There is no account and no server.

Built with Expo (SDK 58), React Native, TypeScript and Expo Router.

## Run it

```bash
npm install
npm start          # then press a for Android, i for iOS (macOS), w for web, or scan the QR code with Expo Go
```

```bash
npm run typecheck  # tsc --noEmit
npm run doctor     # expo-doctor
```

iOS builds do not need a Mac: use EAS (`npx eas-cli@latest build --platform ios`). Android: `npx eas-cli@latest build --platform android --profile preview` gives an APK. Bundle ids are `com.techomato.dailyboard` on both platforms.

## Layout

```
src/app/            Routes (Expo Router). (tabs)/ = Home, Widgets, Insights, Settings. w/[key].tsx renders any widget page. search.tsx = global search.
src/widgets/        One file per widget + registry.tsx (the list of all widgets)
src/store/          State shape (types.ts), sample data (seed.ts), persistence (store.tsx), screen state (ui.tsx)
src/theme/          Palettes (from the HTML preview), design tokens, ThemeProvider
src/components/     Shared UI (ui.tsx), form sheet engine (Sheet.tsx), charts, alarm ringing (AlarmEngine.tsx)
src/lib/            date.ts, logic.ts (all pure rules: streaks, bills, links, search, score), notify.ts (local notifications)
reference/          life-dashboard-preview.html: the approved HTML design to port from
docs/design.md     Architecture, data model and the widget porting plan
```

## Status

All 17 widgets, Home (life score, Today's agenda), Insights, global search, Settings (profile, currency, palettes, theme, widget order, backup and restore) and the cross-widget links from the HTML preview are ported. Alarms and event alerts ring in the app and are scheduled as local notifications on Android and iOS.

Known differences from the preview: dates and times are typed as YYYY-MM-DD and HH:MM (with Today / Tomorrow shortcuts), and alarm notifications use the system default sound.

Not yet tested on a device or simulator (only the web build was clicked through). `tsc`, `expo lint`, `expo-doctor` and `expo export` for Android, iOS and web pass. There are no automated tests yet.
