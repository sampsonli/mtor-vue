/**
 * mtor
 * Copyright (c) 2021 Sampson Li (lichun) <740056710@qq.com>
 * @license MIT
 */
// @ts-ignore
import {onBeforeUnmount, reactive, shallowReactive, watch} from "vue";
import {assign} from "./util";
 import {eventBus} from './EventBus';
 //@ts-ignore
import type {UnwrapNestedRefs} from "@vue/reactivity";

 export {eventBus as evtBus} from './EventBus';
 // 保存所有模块的原型
 const allProto = {} as {[p:string]: any};
 // 保存所有模块的static属性, 方便开发模式热更新静态数据保留
 const allStatic = {} as {[p:string]: any};

 const allState = {} as {[p:string]: any};

 const FLAG_PREFIX = 'mtor/';

 // 用于保存所有模块依赖注入注册的事件， 防止热更新的时候内存泄露
 const allEvents = {};

 /**
  * 定义模块
  * @param {string} md -- 模块（必须包含id属性）
  */
 export function define(md: NodeModule) {
   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
     // @ts-ignore
     md.hot?.accept();
     return service(md.id);
 }

 /**
  * 创建模块
  * @param {string} ns -- 模块名称， 模块名称唯一， 不能有冲突
  */
 export function service(ns: string) {
     return function <T extends Model, K extends { new(): T, ns: string }>(Clazz: K): K {
         const TYPE = `${FLAG_PREFIX}${ns}`;
         const instance = new Clazz();
         const __wired = Clazz.prototype.__wired || {};
         const wiredList = Object.keys(__wired);
         delete Clazz.prototype.__wired;

         // 给外面用的原型实例
         const prototype = {setData: undefined as any, reset: undefined as any, onCreated: undefined as any, __origin: instance, onBeforeClean: undefined as any};

         // 是否正在同步标志位
         let isSyncing = false;
         let toBeSyncState: {[p:string]: any}; // 内部this, 对this 的如何修改都会同步到_toBeSyncState中
         let _toBeSyncState: {[p:string]: any}; // 真正保存中间数据的对象
         // 同步数据方法
         const syncFn = () => {
             if(isSyncing) return; // 节流
             Promise.resolve().then(() => {
                 // 重新实例化对象
                 const newObj = Object.create(allProto[ns]);
                 assign(newObj, _toBeSyncState);
                 allState[ns] = newObj;
                 eventBus.emit(TYPE, newObj);
                 isSyncing = false;
             });
             isSyncing = true;
         }
         Object.getOwnPropertyNames(Clazz.prototype).forEach(key => {
             if (key !== 'constructor' && typeof Clazz.prototype[key] === 'function') {
                 const evtName = `${FLAG_PREFIX}${ns}-function-${key}`;
                 eventBus.clean(evtName);
               // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
               eventBus.on(evtName, ({params, cb}) => {
                     const origin = Clazz.prototype[key];
                     const result = origin.bind(toBeSyncState)(...params);
                     cb(result);
                 });

               // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
               prototype[key] = allProto[ns]?.[key] || function (...params) {
                     let result;
                     eventBus.emit(evtName, {
                         params,
                         cb: (ret: any) => {
                             result = ret
                         }
                     });
                     return result;
                 };
             }
         });

       // eslint-disable-next-line @typescript-eslint/ban-types
         prototype.setData = function (props: Object) {
             const toBeAdd = Object.keys(props).filter((key) => !Object.getOwnPropertyDescriptor(_toBeSyncState, key));
             if(toBeAdd.length) { // 注册新属性
                 toBeAdd.forEach(key => {
                     Object.defineProperty(toBeSyncState, key, {
                         set: (value) => {
                             if (value !== toBeSyncState[key]) {
                                 _toBeSyncState[key] = value;
                                 syncFn();
                             }
                         },
                         get: () => _toBeSyncState[key],
                     })
                 });
             }
           // eslint-disable-next-line @typescript-eslint/ban-ts-comment
             // @ts-ignore
           if(Object.keys(props).some(key => props[key] !== _toBeSyncState[key])) { // 判断有没有修改
                 // 重新实例化对象， 同步设置
                 const newObj = Object.create(allProto[ns]);
                 assign(_toBeSyncState, props);
                 assign(newObj, _toBeSyncState);
                 allState[ns] = newObj;
                 eventBus.emit(TYPE, newObj);
             }
         };
         const initState = Object.create(prototype);

         /**
          * 重置模块数据到初始状态， 一般用于组件销毁的时候调用
          */
         prototype.reset = function () {
             if (typeof prototype.onBeforeClean === 'function') { // 清空数据前钩子函数
               // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                 // @ts-ignore
               prototype.onBeforeClean();
             }
             const newObj = Object.create(allProto[ns]);
             const origin = allProto[ns].__origin;
             Object.getOwnPropertyNames(origin).forEach(key => {
                 newObj[key] = origin[key];
             });
             wiredList.forEach(key => {
                 newObj[key] = allState[__wired[key]];
             });
             initSyncState(newObj);
             allState[ns] = newObj;
             eventBus.emit(TYPE, newObj);
         };
         const finalInstance = allState[ns] || instance;
         Object.getOwnPropertyNames(instance).forEach(key => {
             initState[key] = finalInstance[key];
         });
         wiredList.forEach(key => {
             initState[key] = allState[__wired[key]];
         });

       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
         // @ts-ignore
       allEvents[ns] = allEvents[ns] || {};
       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
         // @ts-ignore
       const events = allEvents[ns];
         wiredList.forEach((key) => {
             const eventName = `${FLAG_PREFIX}${__wired[key]}`
             events[eventName] && eventBus.off(eventName, events[eventName]);
             events[eventName] = (state: any) => {
                 assign(toBeSyncState, {[key]: state})
             }
             eventBus.on(eventName, events[eventName]);
         });

         const initSyncState = (state = allState[ns]) => {
             toBeSyncState = Object.create(prototype);
             _toBeSyncState = {...state};
             Object.keys(state).forEach(key => {
                 Object.defineProperty(toBeSyncState, key, {
                     set: (value) => {
                         if (value !== toBeSyncState[key]) {
                             _toBeSyncState[key] = value;
                             syncFn();
                         }
                     },
                     get: () => _toBeSyncState[key],
                 })
             });
         }
         const isHotReload = !!allProto[ns];
         if (isHotReload) { // 热更新时候用得到
             initSyncState(allState[ns]);
           // eslint-disable-next-line @typescript-eslint/ban-ts-comment
             // @ts-ignore
           assign(toBeSyncState, initState);
             syncFn(); // 强制触发一次更新
             assign(Clazz, allStatic[ns]);
         } else {
             allState[ns] = initState;
             initSyncState(initState);
             allStatic[ns] = assign({}, Clazz);
         }

         allProto[ns] = prototype;
         // 初始化提供created 方法调用, 热更新不重复调用
         if (typeof prototype.onCreated === 'function' && !isHotReload) {
             prototype.onCreated();
         }
         Clazz.ns = ns;
         // assign(Clazz.prototype, prototype); // 覆盖初始原型对象
         return Clazz;
     };
 }

 /**
  * react hooks 方式获取模块类实例
  * @param Class 模块类
  */
const useModel = <T extends Model>(Class: { new(): T, ns: string }): UnwrapNestedRefs<T> => {
     const ns = Class.ns;
     const target = Object.create(allProto[ns]) as T;
     assign(target, allState[ns]);
     const data = shallowReactive(target) as UnwrapNestedRefs<T>
     const eventName = `${FLAG_PREFIX}${ns}`;
     let flag = true; // 避免重复调用watch逻辑
     const setData = (model: any) => {
       assign(data, model);
       flag = false;
     };

     eventBus.on(eventName, setData);
     const cancelWatch = watch(data, (newObj: any) => {
       if(flag) {

           // @ts-ignore
         data.setData(newObj);
       }
       flag = true;
     }, {deep: false});
      onBeforeUnmount(() => {
        eventBus.off(eventName, setData);
        cancelWatch();
      });

   return data;

 };
 module.exports.useModel = useModel;

 /**
  * 按照类型自动注入Model实例
  * @param {Model} Class --模块类
  */
 export function inject<T extends Model>(Class: { new(): T, ns: string }) {
     const ns = Class.ns;
     return (clazz: any, attr: any) => {
         if (!clazz.__wired) {
             clazz.__wired = {};
         }
         clazz.__wired[attr] = ns;
     };
 }


 /**
  * 模块基类，每个模块都应继承该基础模块类
  */
 export class Model {
     static ns = '';

     /**
      * 批量设置模块数据
      * @param data - key-value 对象
      */
     // eslint-disable-next-line @typescript-eslint/ban-types
     setData<T>(this: T, data: { [p in { [c in keyof T]: T[c] extends Function ? never : c }[keyof T]]?: T[p] }) {
         return;
     }

     /**
      * 重置模块数据到初始默认值
      */
     reset() {
         return;
     }
 }

 /**
  * 获取所有模型实例
  */
 export const getModels = () => {
     return allState;
 }



/**
 *  用于保存页面销毁前定时器清除方法回调
 */
const tempObj = {} as {[p:string]: any};
/**
 * 对useModel 方法二次封装的工具方法， 可以避免开发环境热更新重新调用初始化方法以及重置方法。
 * 页面中实例化模块类，同时调用指定初始化方法，以及页面销毁的时候调用 reset方法<br/>
 *
 * @param Clazz - 模块类
 *
 * @param initFn - 模块类中方法名字符串或方法回调
 *
 * @param clean - 是否在页面销毁的时候调用reset方法, 默认true
 */
export const useInitModel = <T extends Model>(Clazz: { new(): T, ns: string }, initFn: (model: UnwrapNestedRefs<T>) => any = () => null, clean = true): UnwrapNestedRefs<T> => {
  const model = useModel(Clazz);

  if (tempObj[Clazz.ns]) {
    clearTimeout(tempObj[Clazz.ns]);
  } else {
    if (typeof initFn === 'function') {
      initFn(model)
    }
  }
  onBeforeUnmount(() => {
    tempObj[Clazz.ns] = setTimeout(() => {
      clean && model.reset();
      delete tempObj[Clazz.ns];
    }, 20);
  })
  return model;
}


