import { useState } from 'react';

const panels = [
  { id: 9, title: 'Public keys observed by the legacy crawler' },
  { id: 11, title: 'Events observed by the legacy crawler' },
  { id: 7, title: 'Legacy relay event distribution' },
  { id: 5, title: 'Legacy relay activity' },
];

export function Stats() {
  const [end, setEnd] = useState<number | null>(null);

  return (
    <section aria-label="Relay statistics availability" className="w-full">
      <div
        role="status"
        className="rounded-xl border border-gray-200 bg-white p-6 text-center"
      >
        <h2 className="text-xl font-bold text-nostr-solid-darker">
          Legacy statistics service unavailable
        </h2>
        <p className="mt-3">
          The legacy Grafana dashboard is not responding. No current relay
          counts can be verified. Directory browsing and search remain
          available.
        </p>
        <p className="mt-3 text-sm">
          You can retry the original charts below. They depend on a separate
          service and may not load.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-gray-400 px-4 py-2 font-medium"
          onClick={() => setEnd(Date.now())}
        >
          Try loading legacy charts
        </button>
      </div>
      {end !== null && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {panels.map((panel) => (
            <iframe
              key={panel.id}
              title={panel.title}
              src={`https://grafana.nostr.directory/d-solo/E5QpXGAVk/nostr-events?orgId=1&from=${
                end - 24 * 60 * 60 * 1000
              }&to=${end}&panelId=${panel.id}`}
              allowFullScreen
              frameBorder={0}
              width="100%"
              height="480"
            />
          ))}
        </div>
      )}
    </section>
  );
}
