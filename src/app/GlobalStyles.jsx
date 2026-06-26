import { C } from '../ui/tokens.js';

export default function GlobalStyles() {
  return (
    <style>{`*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;}body{background:${C.bg};}@keyframes fu{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}input::placeholder{color:${C.dim};}::-webkit-scrollbar{display:none;}.tab-bar{padding:6px 4px max(28px,calc(env(safe-area-inset-bottom) + 6px)) !important;}`}</style>
  );
}
