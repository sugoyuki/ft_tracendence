import './assets/main.css';
import { initializeApp } from './app';

document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');
  
  if (appElement) {
    initializeApp(appElement);
  } else {
    console.error('Root app element not found!');
  }
});
