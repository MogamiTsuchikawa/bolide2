import type { Rectangle } from "electron";

const isRectangle = (value: unknown): value is Rectangle => {
  if (typeof value !== "object" || value === null) return false;
  const rectangle = value as Partial<Rectangle>;
  return (
    typeof rectangle.x === "number" &&
    Number.isFinite(rectangle.x) &&
    typeof rectangle.y === "number" &&
    Number.isFinite(rectangle.y) &&
    typeof rectangle.width === "number" &&
    Number.isFinite(rectangle.width) &&
    rectangle.width > 0 &&
    typeof rectangle.height === "number" &&
    Number.isFinite(rectangle.height) &&
    rectangle.height > 0
  );
};

export const restoreWindowState = (
  savedState: unknown,
  workAreas: readonly Rectangle[],
  primaryWorkArea: Rectangle,
  defaultSize: Pick<Rectangle, "width" | "height">
): Rectangle => {
  if (
    isRectangle(savedState) &&
    workAreas.some(
      (bounds) =>
        savedState.x >= bounds.x &&
        savedState.y >= bounds.y &&
        savedState.x + savedState.width <= bounds.x + bounds.width &&
        savedState.y + savedState.height <= bounds.y + bounds.height
    )
  ) {
    return {
      x: Math.round(savedState.x),
      y: Math.round(savedState.y),
      width: Math.round(savedState.width),
      height: Math.round(savedState.height),
    };
  }

  const width = Math.min(defaultSize.width, primaryWorkArea.width);
  const height = Math.min(defaultSize.height, primaryWorkArea.height);
  return {
    x: primaryWorkArea.x + Math.round((primaryWorkArea.width - width) / 2),
    y: primaryWorkArea.y + Math.round((primaryWorkArea.height - height) / 2),
    width,
    height,
  };
};
