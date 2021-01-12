import { RequestInfo, HttpMiddleware, Response, useReq } from 'farrow-http'
import { GraphQLOptions, HttpQueryError, runHttpQuery, convertNodeHttpToRequest } from 'apollo-server-core'

export interface FarrowGraphQLOptionsFunction {
  (req: RequestInfo): GraphQLOptions | Promise<GraphQLOptions>
}

export function graphqlFarrow(options: GraphQLOptions | FarrowGraphQLOptionsFunction): HttpMiddleware {
  if (!options) {
    throw new Error('Apollo Server requires options.')
  }

  if (arguments.length > 1) {
    // TODO: test this
    throw new Error(`Apollo Server expects exactly one argument, got ${arguments.length}`)
  }

  const graphqlHandler: HttpMiddleware = async (req, next) => {
    return runHttpQuery([req], {
      method: req.method!,
      options: options,
      query: req.method === 'POST' ? req.body : req.query,
      request: convertNodeHttpToRequest(useReq()),
    }).then(
      ({ graphqlResponse, responseInit }) => {
        let res = Response
        if (responseInit.headers) {
          res = res.headers(responseInit.headers)
        }
        return res.string(graphqlResponse)
      },
      (error: HttpQueryError) => {
        if ('HttpQueryError' !== error.name) {
          throw error
        }
        let res = Response
        if (error.headers) {
          res = res.headers(error.headers)
        }
        return Response.status(error.statusCode).string(error.message)
      },
    )
  }

  return graphqlHandler
}
