# Rune mobile UI

The user's three supplied mobile-game references define the visual direction and interaction structure. Apply their hierarchy to Rune's strategy games; their puzzle rules, currency, advertisements, and numbered progression do not define Rune features.

## Collection

- Dark charcoal background, rounded heavy type (Nunito), thick framed game tiles, bright individual game palettes, original board illustrations.
- Two columns on phones; three columns on larger screens. No desktop sidebar or marketing hero on mobile.
- Keep the card concise: title, illustration, favourite star, and availability. Favourite stars save locally and have enlarged touch areas.
- Coming-soon cards open an honest preview. Unfinished games cannot start matches or display invented rules.

## Setup and match

- Home has a three-line menu on the left, the Rune logo in the center, and no settings shortcut on the right. Game screens use Back, game title, and a three-line menu.
- The menu fills the entire viewport and contains All games, Settings, and About Rune. Do not put Your favourites in this menu; collection stars remain available.
- Settings opens as a full-page submenu. Sound, Vibration, and optional search details are saved locally. Vibration is off by default, previews a short pulse when enabled, and gives feedback on a legal player move when supported by the device/browser.
- One short tagline; difficulty gets a clear name, character expression, and three-stop slider.
- Coral Play button, purple help button, large touch controls. **No Level 1 or other numbered progression labels.** Easy, Medium, and Hard are opponent difficulty settings.
- The board is the main focus during a match. Keep status concise; retain undo, hint, new game, and help.
- Technical engine information belongs in About. Search and move history are opt-in through Settings, off by default.

## How to play

- Use a dimmed background and rounded modal, a light instruction card, a high-contrast illustration panel, and one action per step.
- State the step number and total. Dots, previous, and next navigate; unavailable directions are disabled. OK closes at any step; the final step has Let's Play.
- Connect Four: select a column, gravity/stacking, alternate turns, connect four in any direction, block threats/draw condition.
- Gold always represents the player and purple represents Rune, consistently in illustrations and the live board.
- Open automatically for a first match; remain reachable using help afterward. Remember dismissal locally.
- Native modal dialogs provide focus containment and Escape dismissal. Pause/cancel AI while help or settings are open. Restore the match when dismissed.
- Fit the diagram, caption, dots, and controls on small screens; retain scrolling when text size or device constraints require it. Respect reduced-motion settings.

This implementation remains a responsive web app in the existing Vite project; these guidelines can also be reused for a future native shell.
