"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assign = void 0;
function assign(target, from) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (Object.assgin)
        return Object.assign(target, from); // 现代浏览器赋值
    Object.keys(from).forEach(function (key) {
        target[key] = from[key];
    });
    return target;
}
exports.assign = assign;
//# sourceMappingURL=util.js.map