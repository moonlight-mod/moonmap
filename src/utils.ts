export function findFunctionByStrings(
  exports: Record<string, any>,
  ...strings: (string | RegExp)[]
) {
  return (
    Object.entries(exports).filter(
      ([index, func]) =>
        typeof func === "function" &&
        !strings.some(
          (query) =>
            !(query instanceof RegExp
              ? func.toString().match(query)
              : func.toString().includes(query))
        )
    ) ?? null
  );
}

export function findObjectFromKey(exports: Record<string, any>, key: string) {
  let subKey;
  if (key.indexOf(".") > -1) {
    const splitKey = key.split(".");
    key = splitKey[0];
    subKey = splitKey[1];
  }
  for (const exportKey in exports) {
    const obj = exports[exportKey];
    if (obj && obj[key] !== undefined) {
      if (subKey) {
        if (obj[key][subKey]) return exportKey;
      } else {
        return exportKey;
      }
    }
  }
  return null;
}

export function findObjectFromValue(exports: Record<string, any>, value: any) {
  for (const exportKey in exports) {
    const obj = exports[exportKey];
    // eslint-disable-next-line eqeqeq
    if (obj == value) return exportKey;
    for (const subKey in obj) {
      // eslint-disable-next-line eqeqeq
      if (obj && obj[subKey] == value) {
        return exportKey;
      }
    }
  }
  return null;
}

export function findObjectFromKeyValuePair(
  exports: Record<string, any>,
  key: string,
  value: any
) {
  for (const exportKey in exports) {
    const obj = exports[exportKey];
    // eslint-disable-next-line eqeqeq
    if (obj && obj[key] == value) {
      return { key: exportKey, value };
    }
  }
  return null;
}
