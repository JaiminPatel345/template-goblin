---
'template-goblin-ui': patch
---

Fix the canvas appearing invisible on a first-time visit until a page refresh. The root cause was that `useFabricSync`'s effects (ResizeObserver in particular) depended on stable `RefObject` identities for the container and canvas, so when the onboarding picker unmounted and the canvas subtree mounted in its place, the observer stayed bound to the orphaned onboarding `<div>` and never reported the real canvas container's dimensions — Fabric kept its 800×600 fallback instead of resizing to the actual container. The Fabric canvas instance and container element are now mirrored into React state; every effect that used to depend on the ref objects now depends on those state mirrors, so they correctly re-run when the DOM swaps. Closes #17.
