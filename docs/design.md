# DailyBoard design

## Goal
One app that replaces a pile of small apps: habits, tasks, calendar, alarms, money, goals, learning, projects, notes and more, shown as widgets on a customizable home screen. Android and iOS from one codebase. All data stays on the device.

## Decisions (agreed during the HTML preview)
- Expo + React Native + TypeScript, Expo Router for navigation. Android, iOS and web.
- On-device storage only: AsyncStorage (localStorage on web). No backend, no account.
- Look: Techomato brand. Black dark theme by default, "Orange" palette (#C8381F) by default. Four other palettes. System / light / dark.
- Everything is connected: a change in one widget shows up in the others (see "Links" below).

## Architecture
- **Registry** (`src/widgets/registry.tsx`): every widget is `{ key, title, blurb, icon, Card?, Page? }`. Home shows `Card` for enabled widgets in the user's order. `app/w/[key].tsx` renders `Page`. A widget with no `Page` shows as "Coming soon". To add a widget: write `src/widgets/<name>.tsx`, add its data to `State`, register it.
- **Store** (`src/store`): one `State` object in React context. `update(fn)` deep-copies, applies `fn`, and saves to AsyncStorage after 300 ms. Cross-widget links are plain code inside the `update` call, so they stay in one transaction.
- **Theme** (`src/theme`): `ThemeProvider` picks the palette and light/dark. Screens read `useTheme().c`. Spacing, radius and type sizes are in `tokens.ts`. Do not hardcode colours or sizes.
- **Schema changes**: the storage key (`techomato-lifeboard:v2`) is bumped only for a break that cannot be fixed with defaults, which drops old data. New lists are filled in by `load()` in `src/store/load.ts`, so adding a widget does not need a bump.

## Data model (`src/store/types.ts`)
All shapes are in `types.ts` and mirror `function seed()` in `reference/life-dashboard-preview.html`. All rules live as pure functions in `src/lib/logic.ts`.

## Links between widgets (to port from the preview)
- Bill paid creates a Money expense; un-paying or deleting it keeps both in sync.
- A task with "show on calendar" creates a calendar event, kept in sync both ways.
- Water target reached ticks the water habit.
- Reminder, target and due dates from notes, learning, projects, tasks, dates and the watchlist show on the Calendar and in Today's agenda.
- A project task can be copied to Personal tasks and stays in sync. A project can have linked notes.
- Calendar events alert 15 minutes before and at the start (needs expo-notifications, see below).

## Porting plan (suggested order)
1. Shopping, Watchlist, Bills, Journal (simple lists).
2. Money, Goals, Health, Yearly dates.
3. Learning, Projects, Notes.
4. Calendar, then Alarms and event alerts with `expo-notifications` local notifications. The preview only rings while the page is open, so real local notifications are the main upgrade on a phone.
5. Insights.

Each port: copy the data shape and logic from the preview, build the Card and Page in React Native, add tests for the logic (plain functions in `src/lib`), and add the cross-widget links.

## Known gaps
- Not run on a device or simulator yet (web build was clicked through).
- No automated tests yet; `src/lib/logic.ts` is the place to start.
- Alarm notifications cannot be tested in Expo Go on Android (needs a development build).
