"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // O app continua funcionando sem service worker; falhas aqui nao devem interromper a operacao.
    });
  }, []);

  return null;
}
