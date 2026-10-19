/**
 * useLLMObservability – Loads the LangSmith observability config for the
 * dashboard link (enabled flag, project name, deep-link URL).
 */
import { useEffect, useRef, useState } from 'react';

import {
  type ObservabilityConfig,
  fetchObservabilityConfig,
} from '@src/lib/api/callLog';

export interface UseLLMObservabilityResult {
  config: ObservabilityConfig | null
}

/** Loads the LangSmith observability config once on mount. */
export function useLLMObservability(): UseLLMObservabilityResult {
  const [config, setConfig] = useState<ObservabilityConfig | null>(null);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchObservabilityConfig()
      .then(setConfig)
      .catch(() => {
        // Best-effort: no link when the config can't be loaded.
      });
  }, []);

  return { config };
}
