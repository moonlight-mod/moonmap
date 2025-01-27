export function findFunctionByStrings(
  exports: Record<string, any>,
  strings: (string | RegExp)[],
  recursive = false,
  state = new WeakSet()
) {
  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === "function") {
      if (
        strings.every((query) =>
          query instanceof RegExp
            ? value.toString().match(query)
            : value.toString().includes(query)
        )
      ) {
        return key;
      }
    } else if (recursive && typeof value === "object" && value !== null) {
      if (state.has(value)) continue;
      state.add(value);
      const result = findFunctionByStrings(value, strings, recursive, state);
      if (result != null) return key;
    }
  }

  return null;
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
