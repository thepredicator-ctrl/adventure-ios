import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ── Disable copy, select, and context menu globally ──
const preventCopy = (e) => {
  // Allow inside iframes, inputs, textareas, and contenteditable
  const tag = e.target.tagName;
  const editable = e.target.isContentEditable;
  if (tag === 'IFRAME' || tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;
  e.preventDefault();
  return false;
};

document.addEventListener('contextmenu', preventCopy);
document.addEventListener('copy', preventCopy);
document.addEventListener('cut', preventCopy);
document.addEventListener('selectstart', preventCopy);

// Block drag events on everything except inputs
const preventDrag = (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  e.preventDefault();
};
document.addEventListener('dragstart', preventDrag);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
