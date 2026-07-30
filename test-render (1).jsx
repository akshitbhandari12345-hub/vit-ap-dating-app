import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SwipeDeck from './src/pages/SwipeDeck.jsx';

try {
  render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<SwipeDeck />} />
      </Routes>
    </MemoryRouter>
  );
  console.log("SwipeDeck rendered successfully!");
} catch (e) {
  console.error("Error rendering SwipeDeck:", e);
}
