import { CompilerOptions } from './options'
import { parse } from './parse'
import { transform } from './transform'
import { generate, CodegenResult } from './codegen'
import { RootNode } from './ast'
import { isString } from '@vue/shared'
import { transformIf } from './transforms/vIf'
import { transformFor } from './transforms/vFor'
import { transformExpression } from './transforms/transformExpression'
import { transformSlotOutlet } from './transforms/transformSlotOutlet'
import { transformElement } from './transforms/transformElement'
import { transformOn } from './transforms/vOn'
import { transformBind } from './transforms/vBind'
import { trackSlotScopes, trackVForSlotScopes } from './transforms/vSlot'
import { transformText } from './transforms/transformText'
import { transformOnce } from './transforms/vOnce'
import { transformModel } from './transforms/vModel'
import { defaultOnError, createCompilerError, ErrorCodes } from './errors'

// we name it `baseCompile` so that higher order compilers like
// @vue/compiler-dom can export `compile` while re-exporting everything else.
export function baseCompile(
  template: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {
  const onError = options.onError || defaultOnError
  const isModuleMode = options.mode === 'module'
  /* istanbul ignore if */
  if (__BROWSER__) {
    if (options.prefixIdentifiers === true) {
      onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED))
    } else if (isModuleMode) {
      onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED))
    }
  }

  const prefixIdentifiers =
    !__BROWSER__ && (options.prefixIdentifiers === true || isModuleMode)
  if (!prefixIdentifiers && options.cacheHandlers) {
    onError(createCompilerError(ErrorCodes.X_CACHE_HANDLER_NOT_SUPPORTED))
  }
  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED))
  }

  const ast = isString(template) ? parse(template, options) : template
  transform(ast, {
    ...options,
    prefixIdentifiers,
    nodeTransforms: [
      transformOnce,
      transformIf,
      transformFor,
      ...(prefixIdentifiers
        ? [
            // order is important
            trackVForSlotScopes,
            transformExpression
          ]
        : []),
      transformSlotOutlet,
      transformElement,
      trackSlotScopes,
      transformText,
      ...(options.nodeTransforms || []) // user transforms
    ],
    directiveTransforms: {
      on: transformOn,
      bind: transformBind,
      model: transformModel,
      ...(options.directiveTransforms || {}) // user transforms
    }
  })

  return generate(ast, {
    ...options,
    prefixIdentifiers
  })
}
