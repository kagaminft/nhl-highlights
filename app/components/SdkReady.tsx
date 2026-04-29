"use client";
import sdk from "@farcaster/miniapp-sdk";
import { useEffect } from "react";

export default function SdkReady() {
  useEffect(() => {
    try { sdk.actions.ready(); } catch {}
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
