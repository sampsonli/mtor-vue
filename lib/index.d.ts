/// <reference types="node" />
import type { ShallowReactive } from "@vue/reactivity";
export { eventBus as evtBus } from './EventBus';
/**
 * 定义模块
 * @param {string} md -- 模块（必须包含id属性）
 */
export declare function define(md: NodeModule): <T extends Model, K extends {
    new (): T;
    ns: string;
}>(Clazz: K) => K;
/**
 * 创建模块
 * @param {string} ns -- 模块名称， 模块名称唯一， 不能有冲突
 */
export declare function service(ns: string): <T extends Model, K extends {
    new (): T;
    ns: string;
}>(Clazz: K) => K;
/**
 * react hooks 方式获取模块类实例
 * @param Class 模块类
 */
export declare const useModel: <T extends Model>(Class: {
    new (): T;
    ns: string;
}) => ShallowReactive<T>;
/**
 * 按照类型自动注入Model实例
 * @param {Model} Class --模块类
 */
export declare function inject<T extends Model>(Class: {
    new (): T;
    ns: string;
}): (clazz: any, attr: any) => () => string;
/**
 * 模块基类，每个模块都应继承该基础模块类
 */
export declare class Model {
    static ns: string;
    /**
     * 批量设置模块数据
     * @param data - key-value 对象
     */
    setData<T>(this: T, data: {
        [p in {
            [c in keyof T]: T[c] extends Function ? never : c;
        }[keyof T]]?: T[p];
    }): void;
    /**
     * 重置模块数据到初始默认值
     */
    reset(): void;
    /**
     * 注册模块reset前调用方法， 可多次调用
     * @param cb 模块数据被reset前调用回调方法
     */
    protected onBeforeReset(cb: Function): void;
}
/**
 * 获取所有模型实例
 */
export declare const getModels: () => {
    [p: string]: any;
};
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
export declare const useInitModel: <T extends Model>(Clazz: {
    new (): T;
    ns: string;
}, initFn?: (model: ShallowReactive<T>) => any, clean?: boolean) => ShallowReactive<T>;
