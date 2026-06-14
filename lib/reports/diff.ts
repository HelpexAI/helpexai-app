export type ReportDiffLine = {
  type: "equal" | "added" | "removed";
  text: string;
};

export function createLineDiff(previous: string, next: string): ReportDiffLine[] {
  const before = previous.split(/\r?\n/);
  const after = next.split(/\r?\n/);
  if (before.length * after.length > 250_000) {
    return [
      ...before.map((text) => ({ type: "removed" as const, text })),
      ...after.map((text) => ({ type: "added" as const, text })),
    ];
  }
  const matrix = Array.from({ length: before.length + 1 }, () =>
    Array<number>(after.length + 1).fill(0),
  );

  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      matrix[left][right] =
        before[left] === after[right]
          ? matrix[left + 1][right + 1] + 1
          : Math.max(matrix[left + 1][right], matrix[left][right + 1]);
    }
  }

  const result: ReportDiffLine[] = [];
  let left = 0;
  let right = 0;

  while (left < before.length && right < after.length) {
    if (before[left] === after[right]) {
      result.push({ type: "equal", text: before[left] });
      left += 1;
      right += 1;
    } else if (matrix[left + 1][right] >= matrix[left][right + 1]) {
      result.push({ type: "removed", text: before[left] });
      left += 1;
    } else {
      result.push({ type: "added", text: after[right] });
      right += 1;
    }
  }

  while (left < before.length) {
    result.push({ type: "removed", text: before[left] });
    left += 1;
  }
  while (right < after.length) {
    result.push({ type: "added", text: after[right] });
    right += 1;
  }

  return result;
}
