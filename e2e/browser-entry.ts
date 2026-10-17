import { applyHighlight, clearHighlights } from '../src/lib/highlight';
import { observeNavigation } from '../src/lib/navigation';
window.review = { applyHighlight, clearHighlights, observeNavigation };
declare global {
  interface Window {
    review: { applyHighlight: typeof applyHighlight, clearHighlights: typeof clearHighlights, observeNavigation: typeof observeNavigation };
    reviewPopup: { count: number, writes: number[], failWrite: boolean, failRead: boolean, release: () => void };
  }
}
