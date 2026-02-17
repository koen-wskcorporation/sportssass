"use client";

import { useCallback, useMemo, useState } from "react";

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function useHistoryState<T>(initialValue: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: []
  });

  const set = useCallback((next: T | ((current: T) => T)) => {
    setHistory((current) => {
      const resolvedNext = typeof next === "function" ? (next as (value: T) => T)(current.present) : next;

      if (Object.is(resolvedNext, current.present)) {
        return current;
      }

      return {
        past: [...current.past, current.present],
        present: resolvedNext,
        future: []
      };
    });
  }, []);

  const reset = useCallback((next: T) => {
    setHistory({
      past: [],
      present: next,
      future: []
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) {
        return current;
      }

      const previous = current.past[current.past.length - 1];

      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) {
        return current;
      }

      const [next, ...rest] = current.future;

      return {
        past: [...current.past, current.present],
        present: next,
        future: rest
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return useMemo(
    () => ({
      value: history.present,
      set,
      reset,
      undo,
      redo,
      canUndo,
      canRedo
    }),
    [canRedo, canUndo, history.present, redo, reset, set, undo]
  );
}
