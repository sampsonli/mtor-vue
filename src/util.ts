export function assign(target: {[p:string]:any}, from: {[p:string]:any}) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (Object.assgin) return Object.assign(target, from); // 现代浏览器赋值
    Object.keys(from).forEach(key => {
        target[key] = from[key];
    });
    return target;
}