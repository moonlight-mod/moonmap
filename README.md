# moonmap

Mapping utility for unknown JavaScript objects.

## Usage

moonmap functions off of "processors". A processor has a unique ID, priority, an optional filter, and a process function. These must be registered in your `index.ts` file ASAP - not in a Webpack module or on the Node/host sides.

```ts
moonlight.moonmap.register({
  name: "UniqueIDForTheProcessor",
  find: "something to look for",
  process(state) {
    return false;
  }
});
```

The `process` function will be called for every matched module. The state argument contains the moonmap instance, the ID of the matched module, and a string representing the module source code. When `process` returns true, the processor is unregistered, and will not trigger for future modules. Return true when you have found your desired module(s).

## Mapping modules

You can simply do `moonmap.addModule(id, name)` to register a module (e.g. `moonmap.addModule("123456", "CustomName")` means `require("CustomName")` goes to module `123456`).

You can add an export by specifying the name, and what kind of export it is:

```ts
moonmap.addExport(name, "ExportName", {
  type: ModuleExportType.Function,
  find: "something to look for"
});
```

## TODO

- [x] Publish
- [ ] Release to NPM
