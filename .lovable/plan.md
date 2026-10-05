# Free Fire Aim Lab — biomechanical engine upgrade

## Experience
- Preserve key access, saved builds, and admin tools while turning the current range into the main interactive instrument.
- Require every aiming gesture to begin on the floating fire button, for both touch and mouse.
- Add strafing targets, dynamic bloom, Level 3 stock control, chest magnetism, clean headshots, foot-to-head pulls, and overshoot states.
- Show live acceleration, trajectory classification, hit distribution, stability, head dwell, and a head/body heatmap.

## Hardware matrix
- Add touch sampling from 120–720 Hz, custom width and height, in-game General/2x/4x/AWM/Look values, button Y position, and stretched-screen versus black-bars mode.
- Feed sampling delay, aspect behavior, button placement, and training telemetry into the existing bidirectional sensitivity calculation.
- Apply simulator recommendations back to sensitivity and fire-button controls without breaking saved builds.

## Reactive visual system
- Add a lightweight background Canvas with rising sparks and a perspective grid whose speed follows the selected sensitivity mode and user interaction.
- Expand the three existing modes so blur, contrast, glow, animation cadence, parallax, and panel reveal behavior change together.
- Keep effects restrained for readability, responsive, and disabled or simplified when reduced motion is requested.

## Technical approach
- Keep the training range as a modular React Canvas 2D engine with one requestAnimationFrame loop; avoid a heavier 3D dependency for screen-space aim physics.
- Keep the weighted calibration logic in the pure TypeScript engine and route all new inputs through typed state.
- Use semantic CSS tokens and standard `backdrop-filter` only.

## Validation
- Exercise all four shot outcomes, stock/bloom behavior, moving targets, trajectory detection, heatmap, and automatic recommendations.
- Verify theme changes, desktop mouse play, mobile touch play, responsive layout, and clean runtime/build diagnostics.