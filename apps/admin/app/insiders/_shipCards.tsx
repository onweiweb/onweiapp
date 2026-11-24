import {
  CARD_SHIP_VIEWS,
  countCardShipViews,
  getCardParcelSettings,
  istDateOf,
  listCardShipRows,
  readIthinkConfig,
  type CardShipView,
} from "@onwei/core";
import { PAGE_SIZE } from "../_lib/pagination";
import { AdminCard, AdminPager, EmptyState } from "../_components/ui";
import {
  CardShipTable,
  EnvelopeButton,
  SendAllReadyButton,
  UpdateAllButton,
  type CardShipRowData,
} from "./_shipCardsClient";

export { CARD_SHIP_VIEWS, type CardShipView };

const VIEW_LABELS: Record<CardShipView, string> = {
  ready: "Ready to send",
  sent: "Sent",
  problem: "Needs a look",
  noCard: "No card yet",
};

const EMPTY: Record<CardShipView, { title: string; description: string }> = {
  ready: {
    title: "Nothing to send right now",
    description:
      "Members show up here once they share an address with the link in their Insider email and have a printed card.",
  },
  sent: {
    title: "No cards sent yet",
    description:
      "Cards you send to iThink, and cards posted by hand, show up here.",
  },
  problem: {
    title: "Nothing needs a look",
    description:
      "Cards iThink refused, cards coming back, and addresses changed after booking show up here.",
  },
  noCard: {
    title: "Everyone has a printed card",
    description: "Members with an address but no printed card show up here.",
  },
};

export async function ShipCardsTab({
  canManage,
  view,
  page,
}: {
  canManage: boolean;
  view: CardShipView;
  page: number;
}) {
  const now = new Date();
  const [counts, { rows, hasNext }, envelope] = await Promise.all([
    countCardShipViews(now),
    listCardShipRows({ view, page, pageSize: PAGE_SIZE, now }),
    getCardParcelSettings(),
  ]);
  const config = readIthinkConfig();

  const data: CardShipRowData[] = rows.map((row) => ({
    id: row.id,
    name: row.fullName,
    addressShort: `${row.line1}${row.line2 ? `, ${row.line2}` : ""}, ${row.city}, ${row.state} ${row.postalCode}`,
    addressFull: `${row.fullName}, ${row.line1}${row.line2 ? `, ${row.line2}` : ""}, ${row.city}, ${row.state} ${row.postalCode}, ${row.phone}`,
    cardNumber: row.cardNumber,
    postedOn: row.postedAt ? istDateOf(row.postedAt) : null,
    shipment: row.shipment
      ? {
          reference: row.shipment.reference,
          status: row.shipment.status,
          awb: row.shipment.awb,
          courier: row.shipment.courier,
          courierStatus: row.shipment.courierStatus,
          trackingUrl: row.shipment.trackingUrl,
          error: row.shipment.error,
          addressChanged: Boolean(row.shipment.addressChangedAt),
          unsure: row.shipment.unsure,
          deliveredOn: row.shipment.deliveredAt
            ? istDateOf(row.shipment.deliveredAt)
            : null,
          checkedOn: row.shipment.lastCheckedAt
            ? istDateOf(row.shipment.lastCheckedAt)
            : null,
        }
      : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      {!config ? (
        <AdminCard>
          <p className="text-sm text-onwei-blue">
            iThink isn&apos;t connected yet, so cards can&apos;t be sent. Ask
            the developer to add the iThink keys to this site.
          </p>
        </AdminCard>
      ) : config.mode === "staging" ? (
        <AdminCard>
          <p className="text-sm text-onwei-blue">
            <strong>Test mode.</strong> Cards go to iThink&apos;s test server,
            so nothing is really booked or posted, and courier updates there are
            made up.
          </p>
        </AdminCard>
      ) : null}

      <AdminCard className="flex flex-col gap-2 text-sm text-onwei-blue">
        <p>
          <strong>How it works:</strong> send cards to iThink here. Each one
          shows up in the iThink portal, where the team prints the labels and
          hands the envelopes to the courier. Press &ldquo;Update all&rdquo; to
          see where they are. A card counts as posted once the courier picks it
          up.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-onwei-blue/80">
          <span>
            Envelope: {envelope.lengthCm} x {envelope.heightCm} x{" "}
            {envelope.widthCm} cm, {Math.round(envelope.weightKg * 1000)} g,
            value on the parcel ₹{envelope.declaredValue}
          </span>
          {canManage ? <EnvelopeButton initial={envelope} /> : null}
        </div>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CARD_SHIP_VIEWS.map((id) => (
            <a
              key={id}
              href={`/insiders?tab=ship&view=${id}`}
              className={`rounded-full px-3 py-1 text-sm ${
                id === view
                  ? "bg-onwei-blue text-onwei-beige"
                  : "border border-onwei-blue/30 text-onwei-blue"
              }`}
            >
              {VIEW_LABELS[id]} ({counts[id]})
            </a>
          ))}
        </div>
        {canManage && config ? (
          <div className="flex flex-wrap gap-2">
            <UpdateAllButton />
            {view === "ready" ? (
              <SendAllReadyButton ready={counts.ready} />
            ) : null}
          </div>
        ) : null}
      </div>

      {data.length === 0 ? (
        <EmptyState
          title={EMPTY[view].title}
          description={EMPTY[view].description}
        />
      ) : (
        <CardShipTable
          rows={data}
          view={view}
          canManage={canManage}
          canSend={Boolean(config)}
        />
      )}
      <AdminPager
        pathname="/insiders"
        page={page}
        hasNext={hasNext}
        params={{ tab: "ship", view }}
      />
    </div>
  );
}
