import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../services/api";

// Fetches `path`. `loading` is true only until the first response for a path;
// reloads keep the current data on screen and set `refreshing` instead.
// With keepPrevious, a new path also keeps the previous data visible while it loads.
export function useApi(path, { keepPrevious = false } = {}) {
  const [state, setState] = useState({ data: null, error: "", loadedPath: null });
  const [pending, setPending] = useState(Boolean(path));
  const latest = useRef(path);
  latest.current = path;

  const reload = useCallback(async () => {
    if (!path) {
      setState({ data: null, error: "", loadedPath: null });
      setPending(false);
      return;
    }
    setPending(true);
    try {
      const r = await api.get(path);
      if (latest.current === path) setState({ data: r.data, error: "", loadedPath: path });
    } catch (e) {
      if (latest.current === path) setState((s) => ({ ...s, error: errorMessage(e), loadedPath: path }));
    } finally {
      if (latest.current === path) setPending(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  const current = state.loadedPath === path;
  const showData = current || keepPrevious ? state.data : null;
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater })), []);
  return {
    data: showData,
    error: current ? state.error : "",
    loading: Boolean(path) && showData === null && !(current && state.error),
    refreshing: pending,
    reload,
    setData,
  };
}
