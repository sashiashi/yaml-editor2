import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  lastAction: string | null;
}

export function useHistory<T>(initialState: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
    lastAction: null
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const updateState = useCallback((newPresent: T, action?: string) => {
    setState(currentState => ({
      past: [...currentState.past, currentState.present],
      present: newPresent,
      future: [],
      lastAction: action || null
    }));
  }, []);

  const undo = useCallback(() => {
    setState(currentState => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
        lastAction: 'undo'
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
        lastAction: 'redo'
      };
    });
  }, []);

  return {
    state: state.present,
    setState: updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction: state.lastAction
  };
}