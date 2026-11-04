/** 金額を 3 桁区切りにする（例: 35000 → "35,000"）。 */
export function formatYen(value: number): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "{name}" 形式のプレースホルダを埋める。未定義のプレースホルダは例外にする。 */
export function formatMessage(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) {
      throw new Error(`message placeholder is missing: ${key}`);
    }
    return String(params[key]);
  });
}
