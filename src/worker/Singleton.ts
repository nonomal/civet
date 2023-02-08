import 'reflect-metadata'
import { logger } from 'public/Logger'
import { Emitter } from 'public/Emitter'
import { MessagePipeline } from './MessageTransfer'
import { IPCRendererResponse } from 'public/IPCMessage'

const registClasses = new Array<any>();
const serviceIds = new Map<string, any>();

export function getSingleton<T>(ctor: { new (...args: Array<any>): T }): T | undefined {
  const id = (ctor as any).name
  if (serviceIds.has(id)) return serviceIds.get(id)
  return undefined
}

export function injectable<T>(ctor: T) {
  let paramsTypes = Reflect.getMetadata('design:paramtypes', ctor)
  if (registClasses.indexOf(ctor) !== -1) return
  if (paramsTypes && paramsTypes.length) {
    paramsTypes.forEach((v: any, i: any) => {
      if (v === ctor) {
        throw new Error('self dependency')
      }
    })
  }
  registClasses.push(ctor)
}

function checkBasicType<T>(v: T): boolean {
  const t = (v as any).name
  switch(t) {
    case 'Number': return true;
    default:
      return false;
  }
}

export function registSingletonObject<T>(ctor: { new (...args: Array<any>): T }, ...args: any): T {
  const id = (ctor as any).name
  console.debug('registSingletonObject:', id)
  if (serviceIds.has(id)) return serviceIds.get(id)
  let paramsTypes = Reflect.getMetadata('design:paramtypes', ctor)
  if (!paramsTypes) {
    logger.warn(`class ${id} has empty params`)
    const instance = new ctor()
    serviceIds.set(id, instance)
    return instance
  }
  let paramInstances = paramsTypes.map((v: any, i: any) => {
    const vid = (v as any).name
    // let vins = serviceIds[vid]
    // if (vins !== undefined) return vins
    // if (v.length) {
    //   return registSingletonObject(v)
    // }
    if (registClasses.indexOf(v) === -1) {
      for (let idx = 0; idx < args.length; ++idx) {
        // console.info('reflection', typeof args[idx], vid.toLowerCase(), Object.getPrototypeOf(args[idx]).constructor.name)
        if (Object.getPrototypeOf(args[idx]).constructor.name === vid) {
          const ret = args[idx]
          args.splice(idx, 1)
          return ret
        }
      }
      throw new Error(`${id} params[${i}]: class ${(v as any).name} is not injected`)
    } else if (v.length) {
      return registSingletonObject(v)
    } else {
      let vi = serviceIds[(v as any).name]
      if (!vi) {
        vi = new (v as any)()
        serviceIds.set((v as any).name, vi)
      }
      return vi
    }
  })
  const instance = new ctor(...paramInstances)
  console.debug(`new singlecton: ${id}`, instance)
  serviceIds.set(id, instance)
  return instance
}

const hostEvents = new Map<string, Emitter>();

export function getIdentity(event: string, obj?: any): string {
  if (!obj) return event
  if (typeof obj === 'object') {
    return event + '.' + obj.constructor.name
  } else {
    return event + '.' + obj.name
  }
}

export function registHostEvent<T>(event: string, listener: { (...args: Array<any>): T }, thisArg?: any) {
  const id = getIdentity(event, thisArg)
  const cb = hostEvents[id]
  if (cb !== undefined) {
    return
  }
  console.info('registHostEvent', id, event)
  let e = new Emitter()
  if (!thisArg) {
    e.on(event, listener)
  } else {
    const f = function(...args: Array<any>) {
      listener.apply(thisArg, args)
    }
    e.on(event, f)
  }
  hostEvents[id] = e
}

export function emitEvent(id: string, event: string, ...args: any): boolean {
  const e: Emitter = hostEvents[id]
  if (e === undefined) return false
  return e.emit(event, args)
}

export function  emitEventAsync(id: string, event: string, ...args: any): Promise<boolean>| boolean {
  const e: Emitter = hostEvents[id]
  if (e === undefined) return false
  return e.emitAsync(event, args)
}

export function showErrorInfo(msg: any) {
  const pipe = getSingleton(MessagePipeline)
  if (!pipe) return
  pipe.post(IPCRendererResponse.ON_ERROR_MESSAGE, [msg])
  console.error(msg)
}