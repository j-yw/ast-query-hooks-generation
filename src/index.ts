import * as ast from "@babel/types";
export interface CustomHookParams {
  interfaceName: string;
  hookName: string;
  requestType: string;
  responseType: string;
  queryServiceMethod: string;
  queryKey: string;
}

function createCustomHookInterface(
  params: Pick<
    CustomHookParams,
    "interfaceName" | "requestType" | "responseType"
  >
) {
  const { interfaceName, requestType, responseType } = params;
  const propertySignature = ast.tsPropertySignature(
    ast.identifier("request"),
    ast.tsTypeAnnotation(ast.tsTypeReference(ast.identifier(requestType)))
  );
  propertySignature.optional = true;

  return ast.tsInterfaceDeclaration(
    ast.identifier(interfaceName),

    ast.tsTypeParameterDeclaration([ast.tsTypeParameter(null, null, "TData")]),

    [
      ast.tsExpressionWithTypeArguments(
        ast.identifier("ReactQueryParams"),
        ast.tsTypeParameterInstantiation([
          ast.tsTypeReference(ast.identifier(responseType)),
          ast.tsTypeReference(ast.identifier("TData")),
        ])
      ),
    ],

    ast.tsInterfaceBody([propertySignature])
  );
}

function createQueryFn(queryServiceMethod: string) {
  const queryFn = ast.arrowFunctionExpression(
    [],
    ast.blockStatement([
      createQueryServiceCheck(),
      ast.returnStatement(
        ast.callExpression(
          ast.memberExpression(
            ast.identifier("queryService"),
            ast.identifier(queryServiceMethod)
          ),
          [ast.identifier("request")]
        )
      ),
    ]),
    false
  );

  return queryFn;
}

function createQueryServiceCheck() {
  return ast.ifStatement(
    ast.unaryExpression("!", ast.identifier("queryService")),
    ast.throwStatement(
      ast.newExpression(ast.identifier("Error"), [
        ast.stringLiteral("Query Service not initialized"),
      ])
    )
  );
}

function createCustomHookBody(
  params: Pick<
    CustomHookParams,
    "queryServiceMethod" | "queryKey" | "responseType" | "interfaceName"
  >
) {
  const { queryServiceMethod, queryKey, responseType, interfaceName } = params;

  const useQueryHook = ast.callExpression(ast.identifier("useQuery"), [
    ast.arrayExpression([
      ast.stringLiteral(queryKey),
      ast.identifier("request"),
    ]),
    createQueryFn(queryServiceMethod),
    ast.identifier("options"),
  ]);

  useQueryHook.typeParameters = ast.tsTypeParameterInstantiation([
    ast.tsTypeReference(ast.identifier(responseType)),
    ast.tsTypeReference(ast.identifier("Error")),
    ast.tsTypeReference(ast.identifier("TData")),
  ]);

  const customHookBody = ast.arrowFunctionExpression(
    [
      ast.objectPattern([
        ast.objectProperty(
          ast.identifier("request"),
          ast.identifier("request"),
          false,
          true
        ),
        ast.objectProperty(
          ast.identifier("options"),
          ast.identifier("options"),
          false,
          true
        ),
      ]),
    ],

    ast.blockStatement([ast.returnStatement(useQueryHook)]),

    false
  );

  customHookBody.returnType = ast.tsTypeAnnotation(
    ast.tsTypeReference(
      ast.identifier(interfaceName),
      ast.tsTypeParameterInstantiation([
        ast.tsTypeReference(ast.identifier("TData")),
      ])
    )
  );

  return customHookBody;
}

function addTypeParametersToCustomHook(
  responseType,
  customHook: ast.ArrowFunctionExpression
) {
  const typeParamDeclaration = ast.tsTypeParameterDeclaration([
    ast.tsTypeParameter(
      null,
      ast.tsTypeReference(ast.identifier(responseType)),
      "TData"
    ),
  ]);

  const customHookWithTypeParams = ast.arrowFunctionExpression(
    customHook.params,
    customHook.body,
    customHook.async
  );
  customHookWithTypeParams.typeParameters = typeParamDeclaration;
  customHookWithTypeParams.returnType = customHook.returnType;

  return customHookWithTypeParams;
}

function createCustomHook(
  customHookName: string,
  customHookBody: ast.ArrowFunctionExpression,
  responseType: string
) {
  const typedCustomHook = addTypeParametersToCustomHook(
    responseType,
    customHookBody
  );

  return ast.variableDeclaration("const", [
    ast.variableDeclarator(ast.identifier(customHookName), typedCustomHook),
  ]);
}

export function generateCustomHook({
  interfaceName,
  hookName,
  requestType,
  responseType,
  queryServiceMethod,
  queryKey,
}: CustomHookParams) {
  const interfaceAST = createCustomHookInterface({
    interfaceName,
    requestType,
    responseType,
  });

  const useCustomHook = createCustomHookBody({
    queryServiceMethod,
    queryKey,
    responseType,
    interfaceName,
  });

  const customHook = createCustomHook(hookName, useCustomHook, responseType);

  return ast.program([ast.exportNamedDeclaration(interfaceAST), customHook]);
}
