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
- Keep the calibration experience as a single client-side dashboard at `/`; its tools share one live configuration and require no persistence.
- Use semantic CSS tokens and shared HUD utility classes in `src/styles.css`; this keeps the cyber interface consistent and theme-safe.
