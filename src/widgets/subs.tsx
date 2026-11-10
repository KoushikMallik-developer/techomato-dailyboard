import { Card, Empty, Note, Row, Stats, Tag } from "../components/ui";
import { dnum, dl, money } from "../lib/logic";
import { activeSubs, CYCLE_NAME, perMonth, perYear } from "../lib/subs";
import { useStore } from "../store/store";
import { Sub } from "../store/types";
import { useUi } from "../store/ui";
import { MoreLink } from "./shared";

const soon = (x: Sub) => dnum(x.next) <= 7;
const price = (s: Parameters<typeof money>[0], x: Sub) => `${money(s, x.a)} / ${CYCLE_NAME[x.cycle]}`;
const inTxt = (x: Sub) => { const n = dnum(x.next); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + "d"; };

export function SubsCard() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const L = activeSubs(state).sort((a, b) => (a.next < b.next ? -1 : 1));
  return (
    <Card title="Subscriptions" small={L.length ? `${money(state, L.reduce((a, x) => a + perMonth(x), 0))} / month` : undefined}>
      {L.length === 0 ? <Empty text="No subscriptions yet." /> : L.slice(0, 3).map((x) => (
        <Row key={x.id} title={x.n} sub={`${price(state, x)} · renews ${dl(x.next)}`} right={<Tag label={inTxt(x)} tone={soon(x) ? "m" : ""} />} onPress={() => openSheet("sub", "", x.id)} />
      ))}
      {L.length > 3 ? <MoreLink to="subs" n={L.length - 3} /> : null}
    </Card>
  );
}

export function SubsPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const act = activeSubs(state).sort((a, b) => (a.next < b.next ? -1 : 1)), off = state.subs.filter((x) => !x.act);
  const month = act.reduce((a, x) => a + perMonth(x), 0), year = act.reduce((a, x) => a + perYear(x), 0);
  return (
    <>
      <Stats items={[[money(state, month), "Per month"], [money(state, year), "Per year"], [act.length, "Active"]]} />
      <Card title="Active">
        {act.length === 0 ? <Empty text="No active subscriptions. Tap + Add." /> : act.map((x) => (
          <Row key={x.id} title={x.n} sub={`${price(state, x)} · renews ${dl(x.next)}`} right={<Tag label={inTxt(x)} tone={soon(x) ? "m" : ""} />} onPress={() => openSheet("sub", "", x.id)} />
        ))}
      </Card>
      {off.length ? (
        <Card title="Cancelled" small={`saves ${money(state, off.reduce((a, x) => a + perYear(x), 0))} a year`}>
          {off.map((x) => <Row key={x.id} title={x.n} done sub={price(state, x)} onPress={() => openSheet("sub", "", x.id)} />)}
        </Card>
      ) : null}
      <Note>Renewal dates move forward on their own. Nothing is added to Money automatically. You get a reminder the day before each renewal.</Note>
    </>
  );
}
