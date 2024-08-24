import * as t from "@babel/types";
interface HookParams {
  interfaceName: string;
  hookName: string;
  requestType: string;
  responseType: string;
  queryServiceMethod: string;
  queryKey: string;
}

function createReturnType(interfaceName: string) {
  return t.tsTypeReference(
    t.identifier(interfaceName),
    t.tsTypeParameterInstantiation([t.tsTypeReference(t.identifier("TData"))])
  );
}

export function generateHookAST({
  interfaceName,
  hookName,
  requestType,
  responseType,
  queryServiceMethod,
  queryKey,
}: HookParams) {
  const useHookFunction = t.arrowFunctionExpression(
    // params
    [
      t.objectPattern([
        t.objectProperty(t.identifier("request"), t.identifier("request")),
        t.objectProperty(t.identifier("options"), t.identifier("options")),
      ]),
    ],

    // body
    t.blockStatement([
      t.returnStatement(
        t.callExpression(t.identifier("useQuery"), [
          t.arrayExpression([
            t.stringLiteral(queryKey),
            t.identifier("request"),
          ]),
          t.arrowFunctionExpression(
            // params
            [],
            // tsInterfaceBody
            t.blockStatement([
              t.ifStatement(
                t.unaryExpression("!", t.identifier("queryService")),
                t.throwStatement(
                  t.newExpression(t.identifier("Error"), [
                    t.stringLiteral("queryService is not defined"),
                  ])
                )
              ),
              t.returnStatement(
                t.callExpression(
                  t.memberExpression(
                    t.identifier("queryService"),
                    t.identifier(queryServiceMethod)
                  ),
                  [t.identifier("request")]
                )
              ),
            ]),
            // async?
            false
          ),
          t.identifier("options"),
        ])
      ),
    ]),
    //Async?
    false
  );

  useHookFunction.returnType = t.tsTypeAnnotation(
    createReturnType(interfaceName)
  );

  const interfaceAST = t.tsInterfaceDeclaration(
    t.identifier(interfaceName),

    t.tsTypeParameterDeclaration([t.tsTypeParameter(null, null, "TData")]),

    [
      t.tsExpressionWithTypeArguments(
        t.identifier("ReactQueryParams"),
        t.tsTypeParameterInstantiation([
          t.tsTypeReference(t.identifier(responseType)),
          t.tsTypeReference(t.identifier("TData")),
        ])
      ),
    ],

    t.tsInterfaceBody([
      t.tsPropertySignature(
        t.identifier("request"),
        t.tsTypeAnnotation(
          t.tsUnionType([
            t.tsTypeReference(t.identifier(requestType)),
            // t.tsUndefinedKeyword(),
          ])
        )
      ),
    ])
  );

  const hookFunctionX = t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(hookName), useHookFunction),
  ]);

  const arrowFunction = hookFunctionX.declarations[0]
    .init as t.ArrowFunctionExpression;
  const blockStatement = arrowFunction.body as t.BlockStatement;
  const returnStatement = blockStatement.body[0] as t.ReturnStatement;
  const useQueryCall = returnStatement.argument as t.CallExpression;

  if (t.isCallExpression(useQueryCall)) {
    useQueryCall.typeParameters = t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier(responseType)),
      t.tsTypeReference(t.identifier("Error")),
      t.tsTypeReference(t.identifier("TData")),
    ]);
  } else {
    console.error("Expected useQuery call not found in the generated AST");
  }

  return t.program([t.exportNamedDeclaration(interfaceAST), hookFunctionX]);
}
