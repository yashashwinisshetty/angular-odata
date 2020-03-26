import { PlainObject, VALUE, entityAttributes } from '../types';
import { ODataClient } from '../client';
import { Parser, ODataModel, ODataCollection } from '../models';
import { Types } from '../utils';

import { ODataPathSegments } from './path-segments';
import { ODataQueryOptions } from './query-options';
import { ODataEntityAnnotations, ODataCollectionAnnotations, ODataPropertyAnnotations, ODataAnnotations } from './responses';

export class ODataResource<Type> {
  public static readonly QUERY_SEPARATOR = '?';

  // VARIABLES
   protected client: ODataClient;
   protected pathSegments: ODataPathSegments;
   protected queryOptions: ODataQueryOptions;
   protected parser: Parser<Type> | null;

  constructor(
    client: ODataClient,
    segments?: ODataPathSegments,
    options?: ODataQueryOptions,
    parser?: Parser<Type>
  ) {
    this.client = client;
    this.pathSegments = segments || new ODataPathSegments();
    this.queryOptions = options || new ODataQueryOptions();
    this.parser = parser;
  }

  type(): string {
    return this.parser && this.parser.type;
  }

  meta() {
    return this.client.metaForType(this.type());
  }

  path(): string {
    return this.pathSegments.path();
  }

  params(): PlainObject {
    return this.queryOptions.params();
  }

  serialize(obj: Type | Partial<Type>): any {
    return this.parser ? this.parser.toJSON(obj) : obj;
  }

  deserialize(attrs: any): Type | Type[] {
    return this.parser ? this.parser.parse(attrs) : attrs;
  }

  toEntity(body: any): [Type | null, ODataEntityAnnotations | null] {
    return body ? 
      [<Type>this.deserialize(entityAttributes(body)), ODataEntityAnnotations.factory(body)] :
      [null, null];
  }

  toEntities(body: any): [Type[] | null, ODataCollectionAnnotations | null] {
    return body ? 
      [<Type[]>this.deserialize(body[VALUE]), ODataCollectionAnnotations.factory(body)] :
      [null, null];
  }

  toValue(body: any): [Type | null, ODataPropertyAnnotations | null] {
    return body ? 
      [<Type>this.deserialize(body[VALUE]), ODataPropertyAnnotations.factory(body)] :
      [null, null];
  }

  // Model
  toModel<M extends ODataModel<Type>>(entity?: Partial<Type>, annots?: ODataAnnotations): M {
    let Model = this.client.modelForType(this.type());
    return new Model(this, entity, annots) as M;
  }

  toCollection<C extends ODataCollection<Type, ODataModel<Type>>>(entities?: Partial<Type>[], annots?: ODataAnnotations): C {
    let Collection = this.client.collectionForType(this.type());
    return new Collection(this, entities, annots) as C;
  }

  toString(): string {
    let path = this.path();
    let queryString = Object.entries(this.params())
      .map(e => `${e[0]}${ODataQueryOptions.VALUE_SEPARATOR}${e[1]}`)
      .join(ODataQueryOptions.PARAM_SEPARATOR);
    return queryString ? `${path}${ODataResource.QUERY_SEPARATOR}${queryString}` : path
  }

  clone(): ODataResource<Type> {
    let Ctor = <typeof ODataResource>this.constructor;
    return (new Ctor(this.client, this.pathSegments.clone(), this.queryOptions.clone(), this.parser)) as ODataResource<Type>;
  };

  toJSON() {
    let json = <any>{ path: this.pathSegments.toJSON() };
    let type = this.type();
    if (!Types.isNullOrUndefined(type))
      json.type = type;
    let options = this.queryOptions.toJSON();
    if (!Types.isEmpty(options))
      json.query = options;
    return json;
  }

  is(type: string) {
    return this.pathSegments.last().type === type;
  }
}