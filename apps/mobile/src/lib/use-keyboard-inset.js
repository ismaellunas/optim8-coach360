import { useContext } from 'react';
import { KeyboardInsetContext } from './keyboard-inset-context-value.js';

export function useKeyboardInset() {
  return useContext(KeyboardInsetContext);
}
