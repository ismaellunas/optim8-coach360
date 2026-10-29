import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { KeyboardInsetContext } from './keyboard-inset-context-value.js';

function overlayFromViewport() {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return 0;
  }
  const vv = window.visualViewport;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

function publishInset(inset) {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
  }
}

export function KeyboardInsetProvider({ children }) {
  const [pluginHeight, setPluginHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);

  useEffect(function () {
    let cancelled = false;
    const handles = [];

    function setPlugin(next) {
      if (!cancelled) {
        setPluginHeight(Math.max(0, Math.round(next)));
      }
    }

    function syncViewport() {
      if (!cancelled) {
        setOverlayHeight(overlayFromViewport());
      }
    }

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport);
      window.visualViewport.addEventListener('scroll', syncViewport);
      syncViewport();
    }

    if (Capacitor.isNativePlatform()) {
      Promise.all([
        Keyboard.addListener('keyboardWillShow', function (info) {
          setPlugin(info.keyboardHeight || 0);
        }),
        Keyboard.addListener('keyboardDidShow', function (info) {
          setPlugin(info.keyboardHeight || 0);
        }),
        Keyboard.addListener('keyboardWillHide', function () {
          setPlugin(0);
        }),
        Keyboard.addListener('keyboardDidHide', function () {
          setPlugin(0);
        }),
      ]).then(function (list) {
        if (cancelled) {
          list.forEach(function (handle) {
            handle.remove();
          });
          return;
        }
        handles.push.apply(handles, list);
      });
    }

    return function () {
      cancelled = true;
      handles.forEach(function (handle) {
        handle.remove();
      });
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncViewport);
        window.visualViewport.removeEventListener('scroll', syncViewport);
      }
      publishInset(0);
    };
  }, []);

  const height = Math.max(pluginHeight, overlayHeight);

  useEffect(
    function () {
      publishInset(height);
    },
    [height],
  );

  const value = useMemo(
    function () {
      return { height, visible: height > 80 };
    },
    [height],
  );

  return (
    <KeyboardInsetContext.Provider value={value}>{children}</KeyboardInsetContext.Provider>
  );
}
