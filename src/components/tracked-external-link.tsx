"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  jobId: string;
  profileId?: string;
};

export function TrackedExternalLink({ jobId, profileId, onClick, ...props }: Props) {
  function track(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || !profileId) return;
    void fetch(`/api/jobs/${jobId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, actionType: "OPENED" }),
      keepalive: true,
    });
  }

  return <a {...props} onClick={track} />;
}
