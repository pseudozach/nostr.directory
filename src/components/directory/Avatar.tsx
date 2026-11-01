import React, { useState } from 'react';

import { safeImage } from './model';

export function Avatar({ picture }: { picture?: string }) {
  const [approvedPicture, setApprovedPicture] = useState<string>();
  const [failed, setFailed] = useState(false);
  const source = safeImage(picture);

  if (!source) return null;

  return (
    <div className="directory-avatar">
      {approvedPicture === source ? (
        // A plain image keeps this explicitly opted-in request out of image proxies.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt=""
          width="48"
          height="48"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => {
            setApprovedPicture(undefined);
            setFailed(true);
          }}
        />
      ) : (
        <>
          {failed && <span role="status">External avatar unavailable.</span>}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setApprovedPicture(source);
            }}
          >
            Load external avatar
            <span className="directory-avatar-disclosure">
              Contacts an external image host, revealing your IP address.
            </span>
          </button>
        </>
      )}
    </div>
  );
}
