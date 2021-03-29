export function mergeObjects(a: any, b: any): any {
  function recurse(a: any, b: any): any {
    let result = null;
    if (!Array.isArray(a)) {
      result = { ...a };
      for (const key of Object.keys(a)) {
        if (key in b) {
          if (typeof b[key] === "object" && b[key] !== null) {
            result[key] = recurse(a[key], b[key]);
          } else {
            result[key] = b[key];
          }
        }
      }
    } else {
      result = [...a, ...b];
    }
    return result;
  }
  return recurse(a, b);
}
