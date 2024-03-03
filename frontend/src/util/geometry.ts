function clamp(x: number, a: number, b: number) {
  return Math.min(Math.max(x, a), b);
}

function intersectLineSegmentStartingAtBoxCenter(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  xd: number,
  yd: number
) {
  const xCenter = (x1 + x2) / 2;
  const yCenter = (y1 + y2) / 2;

  const xDiff = xd - xCenter;
  const yDiff = yd - yCenter;

  return {
    x: clamp(
      xCenter + (Math.sign(yd - yCenter) * (yCenter - y1) * xDiff) / yDiff,
      x1,
      x2
    ),
    y: clamp(
      yCenter + (Math.sign(xd - xCenter) * (xCenter - x1) * yDiff) / xDiff,
      y1,
      y2
    ),
  };
}
