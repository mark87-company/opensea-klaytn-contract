import { Contract } from "caver-js";

export function createCode(name: string, contract: Contract) {
  let code = `
    const _jsonInterface = ${JSON.stringify(contract._jsonInterface)};
    function _readyMethod(name: string, p: unknown[]) {
        const _interface = _jsonInterface.find((__interface) => {
            return __interface.name == name;
        });
        return {
          jsonInterface:_interface,
          args: p,
        }
    }
    const ${name} = {
  `;

  const { address } = contract.options;

  code += `
    jsonInterface: _jsonInterface,
    address : "${address}",
  `;

  const functionNames = new Set<string>();

  (contract._jsonInterface as any[])
    .filter(({ type }) => {
      return type == "function";
    })
    .forEach(({ inputs, name, outputs, signature }) => {
      if (!inputs || !name || !outputs || !signature) {
        return;
      }

      if (functionNames.has(name)) {
        return;
      }

      functionNames.add(name);

      const inputTypes = (inputs as any[])
        .map(({ type, name }, index) => {
          const typeForTs = type
            .replace(/uint\d+/, "number")
            .replace("address", "`0x${string}`")
            .replace("bool", "boolean")
            .replace(/bytes\d*/, "string");

          name ||= `__param_${type}_${index}_`;

          return `${name}: ${typeForTs}`;
        })
        .join(",");

      code += `
        ${name}(${inputTypes}) {  return _readyMethod("${name}", Array.from(arguments));  },
      `;
    });

  code = `
        ${code} 
    } as const;
    
    export default ${name};
  `;

  return code.trim();
}
