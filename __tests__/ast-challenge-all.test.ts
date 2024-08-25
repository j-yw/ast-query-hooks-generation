import { generateCustomHook } from "../src/index";
import generate from "@babel/generator";
import * as prettier from "prettier";
import * as fs from "fs";
import * as path from "path";

interface MethodData {
  requestType: string;
  responseType: string;
}

interface Methods {
  [methodName: string]: MethodData;
}

describe("Generate multiple hooks: ", () => {
  it("worked", async () => {
    const methods: Methods = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../example-methods.json"), "utf-8")
    );

    for (const [methodName, methodData] of Object.entries(methods)) {
      const ast = generateCustomHook({
        interfaceName: `Use${methodName}Query`,
        customHookName: `use${methodName}`,
        requestType: methodData.requestType,
        responseType: methodData.responseType,
        queryServiceMethod: methodName.toLowerCase(),
        queryKey: `${
          methodName.charAt(0).toLowerCase() + methodName.slice(1)
        }Query`,
      });

      const { code } = generate(ast as any);
      const formattedCode = prettier.format(code, { parser: "typescript" });
      console.log(formattedCode);
      expect(formattedCode).toMatchSnapshot(methodName);
    }
  });
});
