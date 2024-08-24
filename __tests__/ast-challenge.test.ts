import { generateCustomHook } from "../src/index";
import generate from "@babel/generator";
import * as prettier from "prettier";

describe("Generate Hook: ", () => {
  it("should return one hook", async () => {
    const ast = generateCustomHook({
      interfaceName: "UsePoolsQuery",
      hookName: "usePools",
      requestType: "QueryPoolsRequest",
      responseType: "QueryPoolsResponse",
      queryServiceMethod: "pools",
      queryKey: "poolsQuery",
    });

    const { code } = generate(ast as any);

    const formattedCode = prettier.format(code, {
      parser: "typescript",
      singleQuote: true,
    });

    console.log(formattedCode);

    expect(formattedCode).toMatchSnapshot();
  });
});
