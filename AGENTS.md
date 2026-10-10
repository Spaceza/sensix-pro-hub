<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SensiX Pro architecture
- Keep the calibration and key-admin experience at `/`; calibration tools share one live configuration, while access and saved profiles use Lovable Cloud through server functions.
- Use semantic CSS tokens and shared HUD utility classes in `src/styles.css`; this keeps the cyber interface consistent and theme-safe.
- Keep the playable training range as a lazy-loaded, client-only React Three Fiber module; the requested third-person camera and raycast hitboxes require 3D, while vector input and camera physics stay in refs/useFrame.
- Keep trial telemetry and recalibration in browser-safe pure modules; this enables deterministic testing and shares one configuration between the range, hardware controls, and saved profiles.
