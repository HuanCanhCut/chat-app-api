import { IRequest } from '~/types/type'

export interface TypedRequest<TBody = any, TParams = any, TQuery = any>
    extends Omit<IRequest, 'body' | 'params' | 'query'> {
    body: TBody
    params: TParams
    query: TQuery
}
