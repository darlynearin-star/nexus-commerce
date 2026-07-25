import { Router } from 'express';

export const templatesRouter = Router();

const TEMPLATES = [
  {
    id: 'elegance',
    name: 'Elegance',
    description: 'Gold accents on dark — timeless luxury',
    defaultColors: { primary: '#D4A843', secondary: '#A8822E', bg: '#0A0A0A', surface: '#141414', text: '#FAFAFA', accent: '#F0D48A' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean whites, soft grays — modern simplicity',
    defaultColors: { primary: '#2D2D2D', secondary: '#6B6B6B', bg: '#FFFFFF', surface: '#F8F8F6', text: '#1A1A1A', accent: '#B8B8B8' },
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast red on dark — energetic edge',
    defaultColors: { primary: '#FF4433', secondary: '#CC3322', bg: '#0A0A0A', surface: '#1A1A1A', text: '#FAFAFA', accent: '#FF6655' },
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Earthy greens, warm browns — organic feel',
    defaultColors: { primary: '#5B8C5A', secondary: '#4A7349', bg: '#F8F6F0', surface: '#F0EDE4', text: '#2C2C2C', accent: '#7DAD7C' },
  },
];

templatesRouter.get('/', (_req, res) => {
  res.json({ success: true, data: TEMPLATES });
});
