'use client';

import React from 'react';

export default function DebugTypewriter() {
  const text = "We are under development";
  const highlightWord = "development";
  const highlightIndex = text.indexOf(highlightWord);
  
  console.log("Full text:", JSON.stringify(text));
  console.log("Text length:", text.length);
  console.log("Highlight word:", JSON.stringify(highlightWord));
  console.log("Highlight index:", highlightIndex);
  console.log("Before highlight:", JSON.stringify(text.substring(0, highlightIndex)));
  console.log("After highlight:", JSON.stringify(text.substring(highlightIndex)));
  
  return (
    <div className="p-4 bg-gray-800 text-white font-mono text-sm">
      <div>Full text: "{text}"</div>
      <div>Text length: {text.length}</div>
      <div>Highlight word: "{highlightWord}"</div>
      <div>Highlight index: {highlightIndex}</div>
      <div>Before highlight: "{text.substring(0, highlightIndex)}"</div>
      <div>After highlight: "{text.substring(highlightIndex)}"</div>
      <div className="mt-4">
        <span className="text-white">{text.substring(0, highlightIndex)}</span>
        <span className="text-orange-500">{text.substring(highlightIndex)}</span>
      </div>
    </div>
  );
}
