import {
  findFunctionByStrings,
  findObjectFromKey,
  findObjectFromValue,
  findObjectFromKeyValuePair
} from "./utils";

export type MappingProcessor = {
  name: string;
  find?: (string | RegExp)[] | (string | RegExp);
  priority?: number;
  manual?: boolean;
  process: (state: MappingProcessorState) => boolean;
};

export type MappingProcessorState = {
  id: string;
  code: string;
  moonmap: Moonmap;
  trigger: (id: string, tag: string) => void;
};

export enum ModuleExportType {
  Function,
  Key,
  Value,
  KeyValuePair,
  Constant
}

type WebpackModule = (
  module: any,
  exports: any,
  require: (id: string) => any
) => void;

export type ModuleExport =
  | {
      type: ModuleExportType.Function;
      find: string | RegExp;
    }
  | {
      type: ModuleExportType.Key;
      find: string;
    }
  | {
      type: ModuleExportType.Value;
      find: any;
    }
  | {
      type: ModuleExportType.KeyValuePair;
      key: string;
      value: any;
    }
  | {
      type: ModuleExportType.Constant;
      find: string;
    };

export default class Moonmap {
  private processors: MappingProcessor[];
  private successful: Set<string>;
  private getModuleSource?: (id: string) => string;
  private sentModules: Set<string>;

  modules: Record<string, string>;
  exports: Record<string, Record<string, ModuleExport>>;

  elapsed: number;

  constructor() {
    this.processors = [];
    this.successful = new Set();

    this.modules = {};
    this.exports = {};
    this.sentModules = new Set();

    this.elapsed = 0;
  }

  public register(processor: MappingProcessor) {
    this.processors.push(processor);
  }

  public parseScript(id: string, code: string) {
    const start = performance.now();

    const available = [...this.processors]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .filter((x) => {
        if (x.find == null) return true;
        const finds = Array.isArray(x.find) ? x.find : [x.find];
        return finds.every((find) =>
          typeof find === "string" ? code.indexOf(find) !== -1 : find.test(code)
        );
      })
      .filter((x) => x.manual !== true);

    this.parseScriptInternal(id, code, available);

    const end = performance.now();
    this.elapsed += end - start;
  }

  private parseScriptInternal(
    id: string,
    code: string,
    processors: MappingProcessor[]
  ) {
    if (processors.length === 0) return;

    const state: MappingProcessorState = {
      id,
      code,
      moonmap: this,
      trigger: (id, tag) => {
        const source = this.getModuleSourceById(id);
        if (source == null) return;
        if (this.successful.has(tag)) return;
        const processor = this.processors.find((x) => x.name === tag);
        if (processor == null) return;
        this.parseScriptInternal(id, source, [processor]);
      }
    };

    for (const processor of processors) {
      if (processor.process(state)) {
        this.processors.splice(this.processors.indexOf(processor), 1);
        this.successful.add(processor.name);
      }
    }
  }

  public setModuleSourceGetter(getSource: (id: string) => string) {
    this.getModuleSource = getSource;
  }

  public getModuleSourceById(id: string) {
    return this.getModuleSource?.(id) ?? null;
  }

  public addModule(id: string, moduleName: string) {
    if (this.modules[moduleName] != null) {
      throw new Error(
        `Tried to register module ${moduleName} twice (originally ${this.modules[moduleName]}, redefined to ${id})`
      );
    }
    this.modules[moduleName] = id;
  }

  public addExport(
    moduleName: string,
    exportName: string,
    moduleExport: ModuleExport
  ) {
    if (!this.exports[moduleName]) this.exports[moduleName] = {};
    if (this.exports[moduleName][exportName]) {
      throw new Error(
        `Tried to register export ${exportName} on ${moduleName} twice`
      );
    }
    this.exports[moduleName][exportName] = moduleExport;
  }

  private processExport(
    original: any,
    exportName: string,
    moduleExport: ModuleExport
  ) {
    switch (moduleExport.type) {
      case ModuleExportType.Function: {
        const match = findFunctionByStrings(original, moduleExport.find);
        return match?.[0]?.[0];
      }

      case ModuleExportType.Key: {
        return findObjectFromKey(original, moduleExport.find);
      }

      case ModuleExportType.Value: {
        return findObjectFromValue(original, moduleExport.find);
      }

      case ModuleExportType.KeyValuePair: {
        return findObjectFromKeyValuePair(
          original,
          moduleExport.key,
          moduleExport.value
        )?.value;
      }

      case ModuleExportType.Constant: {
        return moduleExport.find;
      }

      default:
        return null;
    }
  }

  public remap(moduleName: string, obj: any) {
    if (typeof obj === "function") return obj;

    const keysToMap: Record<string, string> = {};
    const newExports: Record<string, any> = {};

    for (const [exportName, mappedExport] of Object.entries(
      this.exports[moduleName] ?? {}
    )) {
      let unmappedName = this.processExport(obj, exportName, mappedExport);
      if (unmappedName != null) keysToMap[unmappedName] = exportName;
    }

    if (obj.Z != null || obj.ZP != null) {
      keysToMap[obj.ZP ? "ZP" : "Z"] = "default";
      newExports.__esModule = true;
    }

    for (const [key, value] of Object.entries(obj)) {
      const remapped = keysToMap[key];
      if (remapped) {
        newExports[remapped] = value;
      } else {
        newExports[key] = value;
      }
    }

    return newExports;
  }

  public getWebpackModules(global: string) {
    const ret: Record<string, WebpackModule> = {};
    for (const moduleName of Object.keys(this.modules)) {
      if (this.sentModules.has(moduleName)) continue;
      this.sentModules.add(moduleName);

      ret[moduleName] = new Function(
        "module",
        "exports",
        "require",
        `
(function moonmap(module, exports, require) {
  module.exports = ${global}.remap("${moduleName}", require("${this.modules[moduleName]}"));
}).apply(this, arguments)`.trim()
      ) as WebpackModule;
    }

    return ret;
  }
}
