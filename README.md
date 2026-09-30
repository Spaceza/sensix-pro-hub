# SensiX Pro Dashboard

Act as a Principal UI/UX Designer and Senior Front-End Developer. Build a hyper-modern, sophisticated, and gamified web application for Free Fire players called "SensiX Pro" (or a similar futuristic name).



### 1. Visual & Theme Aesthetics

- **Style:** Cyberpunk/Futuristic eSports HUD. Dark mode by default (`#0a0a0c` background) with glowing neon accents (fire orange `#ff5500`, neon cyan, and deep purple).

- **Vibe:** Glassmorphism, smooth animations (Framer Motion style or CSS transitions), glowing borders, micro-interactions, custom scrollbars, and tactile audio-visual feel.

- **Tech Stack:** Clean, self-contained HTML, CSS (Tailwind CSS or custom CSS with CSS variables), and vanilla JavaScript. Responsive across mobile, tablet, and desktop.



### 2. Core Features & Layout Structure



#### A. Hero Section & Dashboard

- Futuristic glowing header with logo, sound toggle (cyber SFX on click), and status indicator ("Status: Operational / Anti-Lag Engine Ready").

- Quick-action CTA buttons linking directly to the main generators below.



#### B. Sensitivity Generator (0 - 200 Scale)

- **Input Controls:**

  - Phone Brand/Model dropdown (e.g., Xiaomi, Samsung, Apple, Motorola, Realme, ASUS ROG).

  - Screen Resolution selector (HD+, FHD+, QHD+) or custom DPI input (e.g., 360, 411, 600, 800).

- **Interactive Output:** An animated card displaying generated values for:

  - Geral, Ponto Vermelho (Red Dot), 2x, 4x, AWM, and Olhadinha.

  - Includes a "Copy All Values" button with toast notification.

  - "Generate New Combination" button with a sleek scanning laser effect.



#### C. Fire Button Size Generator & Pull-Up Adjuster

- Interactive slider or selector for player grip/hand size (Small, Medium, Large) and swipe style (Fast Drag, Curved Drag, Straight Drag).

- **Result:** Recommended Fire Button Size (%) and optimal screen placement guide (Visual HUD graphic showing exact drag zone).



#### D. Touch Screen & Aim Calibration System (Visual Simulator)

- **Touch Screen Calibrator:** A gamified "Calibrate Touch" widget. Clicking it triggers an interactive 3-step target test (tap glowing nodes) that calculates response latency and applies a fake "Optimized Touch Matrix" booster effect.

- **Scope Stabilization / Anti-Shake Guide:** Interactive toggles (Visual Sliders for "Gyroscope Compensation", "Screen Friction Adjustment", "Jitter Removal Filter") showing real-time impact on a simulated recoil pattern SVG.



#### E. System & Pointer Speed Fine-Tuner

- Sliders for System Pointer Speed, Touch & Hold Delay (ms), and DPI Converter.

- Custom recommendations based on whether the device runs iOS or Android.



#### F. Pro Tips & Secret Tricks Library

- Categorized accordion or tabbed interface:

  - "Trick Shots & Drag Patterns"

  - "Screen Physics & Powder/Sleeve Hacks"

  - "In-Game Display & Graphics Tweak"



### 3. Gamification & Interactivity Requirements

- Add a "Download Configuration Profile" button (generates a clean visual summary card or PDF/Image snapshot of the user's setup).

- Haptic feedback simulator (visual screen pulses/vibes when buttons are pressed).

- Modern sound effects (using Web Audio API or lightweight embedded audio triggers for clicks/generation).



Make the layout ultra-clean, intuitive, fast-loading, and strictly high-end. No generic template feel—make it 

look like a high-tier eSports tool dashboard. (O site é em português e pode ser possível alterar pra inglês)

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sensix-pro-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f4dbc57-a104-4e2d-bb38-057ea7a7dafe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
