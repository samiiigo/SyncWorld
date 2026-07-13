export const TOP_HEADER_PADDING_TOP = 8;
/** Large title size on tab / stack headers. */
export const TOP_HEADER_TITLE_FONT_SIZE = 36;
/** Circular action button row height. */
export const TOP_HEADER_BUTTON_ROW_HEIGHT = 44;
/** Bottom padding below the header action row. */
export const TOP_HEADER_PADDING_BOTTOM = 8;
export const TOP_HEADER_BODY_HEIGHT =
  TOP_HEADER_PADDING_TOP + TOP_HEADER_BUTTON_ROW_HEIGHT + TOP_HEADER_PADDING_BOTTOM;

export function getScrollPaddingTop(safeAreaTop: number): number {
  return safeAreaTop + TOP_HEADER_BODY_HEIGHT;
}
