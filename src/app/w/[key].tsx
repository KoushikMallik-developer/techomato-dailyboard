import { useLocalSearchParams } from "expo-router";
import { TopBar } from "../../components/TopBar";
import { PageHead, Screen, T } from "../../components/ui";
import { newNote } from "../../lib/logic";
import { useStore } from "../../store/store";
import { WidgetKey } from "../../store/types";
import { useUi } from "../../store/ui";
import { WIDGETS } from "../../widgets/registry";

/** One route renders every widget page. The widget comes from the registry. */
export default function WidgetScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { update } = useStore();
  const { ui, set, openSheet } = useUi();
  const w = WIDGETS[key as WidgetKey];
  if (!w) return <Screen><TopBar /><PageHead back title="Not found" /><T>Unknown widget.</T></Screen>;
  const Page = w.Page;
  const add = () => {
    if (!w.add) return;
    if (w.add[0] === "note") { let id = 0; update((s) => { id = newNote(s, ui.nfolder).id; }); set({ nview: "edit", nid: id }); }
    else openSheet(w.add[0], w.add[1]);
  };
  return (
    <Screen>
      <TopBar />
      <PageHead back title={w.title} action={w.add ? { label: "+ Add", onPress: add } : undefined} />
      <Page />
    </Screen>
  );
}
