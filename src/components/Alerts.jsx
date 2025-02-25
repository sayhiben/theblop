import React from 'react';

export function SiteAlerts({ alerts }) {
  return (
    <div className="alerts">
      {alerts.map((alert) => (
        <div key={alert.id} className="w-full mb-2 select-none rounded-t-lg border-t-4 border-yellow-400 bg-yellow-100 p-4 font-medium hover:border-yellow-500">
          <h3 className="text-yellow-800">{alert.title}</h3>
          {alert.message}
        </div>
      ))}
    </div>
  );
}